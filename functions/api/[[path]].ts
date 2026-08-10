import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { MatcherEngine } from "../../src/engine_ts/matcher";
import { RecommenderEngine } from "../../src/engine_ts/recommender";
import { Group, Member, Venue } from "../../src/engine_ts/models";

export type Env = {
    Bindings: {
        DB: D1Database;
    };
};

const app = new Hono<Env>().basePath("/api");

// Helper to generate Base64 URL-safe random string for Session ID
function generateSessionId(length = 12): string {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

// 1. POST /api/rooms - Create new Group Session Room
app.post("/rooms", async (c) => {
    try {
        const body = await c.req.json<{
            group_name: string;
            passcode?: string;
            threshold_pct?: number;
        }>();

        if (!body.group_name || body.group_name.trim() === "") {
            return c.json({ error: "group_name is required" }, 400);
        }

        const roomId = generateSessionId(12);
        const groupName = body.group_name.trim();
        const passcode = body.passcode || null;
        const thresholdPct = body.threshold_pct ?? 0.8;

        await c.env.DB.prepare(
            `INSERT INTO rooms (id, group_name, passcode, threshold_pct) VALUES (?, ?, ?, ?)`
        )
            .bind(roomId, groupName, passcode, thresholdPct)
            .run();

        return c.json({
            success: true,
            room: {
                id: roomId,
                group_name: groupName,
                threshold_pct: thresholdPct,
                share_url: `/room/${roomId}`
            }
        }, 201);
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to create room" }, 500);
    }
});

// 2. GET /api/rooms/:id - Get Room Details & Analyzed Schedule
app.get("/rooms/:id", async (c) => {
    try {
        const roomId = c.req.param("id");

        // Fetch room
        const room = await c.env.DB.prepare(
            `SELECT * FROM rooms WHERE id = ?`
        )
            .bind(roomId)
            .first<{ id: string; group_name: string; passcode: string; threshold_pct: number }>();

        if (!room) {
            return c.json({ error: "Room not found" }, 404);
        }

        // Fetch members
        const { results: memberRows } = await c.env.DB.prepare(
            `SELECT * FROM members WHERE room_id = ? ORDER BY created_at ASC`
        )
            .bind(roomId)
            .all<{ id: string; name: string; matrix_json: string }>();

        const members: Member[] = (memberRows || []).map((m) => ({
            id: m.id,
            name: m.name,
            matrix: JSON.parse(m.matrix_json)
        }));

        // Calculate schedule matrix matching
        const group: Group = {
            members,
            threshold_pct: room.threshold_pct ?? 0.8
        };
        const analysis = MatcherEngine.analyzeSchedule(group);

        // Fetch votes
        const { results: voteRows } = await c.env.DB.prepare(
            `SELECT * FROM room_venue_votes WHERE room_id = ?`
        )
            .bind(roomId)
            .all<{ id: string; venue_id: string; voter_name: string }>();

        return c.json({
            success: true,
            room: {
                id: room.id,
                group_name: room.group_name,
                threshold_pct: room.threshold_pct
            },
            members,
            analysis,
            votes: voteRows || []
        });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to fetch room" }, 500);
    }
});

// 3. POST /api/rooms/:id/members - Upsert member matrix in room
app.post("/rooms/:id/members", async (c) => {
    try {
        const roomId = c.req.param("id");
        const body = await c.req.json<{
            member_id?: string;
            name: string;
            matrix: number[][];
        }>();

        if (!body.name || !body.matrix) {
            return c.json({ error: "name and matrix are required" }, 400);
        }

        // Verify room exists
        const room = await c.env.DB.prepare(`SELECT id FROM rooms WHERE id = ?`)
            .bind(roomId)
            .first();

        if (!room) {
            return c.json({ error: "Room not found" }, 404);
        }

        const memberId = body.member_id || generateSessionId(8);
        const matrixJson = JSON.stringify(body.matrix);

        // Check if member exists in room
        const existing = await c.env.DB.prepare(
            `SELECT id FROM members WHERE room_id = ? AND (id = ? OR name = ?)`
        )
            .bind(roomId, memberId, body.name)
            .first<{ id: string }>();

        if (existing) {
            await c.env.DB.prepare(
                `UPDATE members SET name = ?, matrix_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
            )
                .bind(body.name, matrixJson, existing.id)
                .run();
        } else {
            await c.env.DB.prepare(
                `INSERT INTO members (id, room_id, name, matrix_json) VALUES (?, ?, ?, ?)`
            )
                .bind(memberId, roomId, body.name, matrixJson)
                .run();
        }

        return c.json({ success: true, member_id: existing ? existing.id : memberId });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to save member schedule" }, 500);
    }
});

// 4. DELETE /api/rooms/:id/members/:memberId - Remove member
app.delete("/rooms/:id/members/:memberId", async (c) => {
    try {
        const roomId = c.req.param("id");
        const memberId = c.req.param("memberId");

        await c.env.DB.prepare(
            `DELETE FROM members WHERE room_id = ? AND id = ?`
        )
            .bind(roomId, memberId)
            .run();

        return c.json({ success: true });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to delete member" }, 500);
    }
});

// 5. GET /api/venues - Query Venues
app.get("/venues", async (c) => {
    try {
        const ward = c.req.query("ward");
        const category = c.req.query("category");

        let sql = `SELECT * FROM venues WHERE 1=1`;
        const params: any[] = [];

        if (ward && ward !== "all") {
            sql += ` AND LOWER(ward) = LOWER(?)`;
            params.push(ward);
        }

        if (category && category !== "all") {
            sql += ` AND category = ?`;
            params.push(category);
        }

        const stmt = c.env.DB.prepare(sql);
        const { results } = params.length > 0 ? await stmt.bind(...params).all<any>() : await stmt.all<any>();

        const venues: Venue[] = (results || []).map((v) => ({
            id: v.id,
            name: v.name,
            category: v.category,
            time_tags: JSON.parse(v.time_tags || "[]"),
            price_range: v.price_range,
            capacity: v.capacity,
            address: v.address,
            city: v.city,
            ward: v.ward,
            lat: v.lat,
            lng: v.lng,
            rating: v.rating,
            tags: JSON.parse(v.tags || "[]"),
            image_url: v.image_url || ""
        }));

        return c.json({ success: true, count: venues.length, venues });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to query venues" }, 500);
    }
});

// 6. POST /api/rooms/:id/votes - Vote for a venue in room
app.post("/rooms/:id/votes", async (c) => {
    try {
        const roomId = c.req.param("id");
        const body = await c.req.json<{ venue_id: string; voter_name: string }>();

        if (!body.venue_id || !body.voter_name) {
            return c.json({ error: "venue_id and voter_name are required" }, 400);
        }

        const voteId = generateSessionId(8);

        await c.env.DB.prepare(
            `INSERT INTO room_venue_votes (id, room_id, venue_id, voter_name) VALUES (?, ?, ?, ?)`
        )
            .bind(voteId, roomId, body.venue_id, body.voter_name)
            .run();

        return c.json({ success: true, vote_id: voteId });
    } catch (err: any) {
        return c.json({ error: err.message || "Failed to vote venue" }, 500);
    }
});

export const onRequest = handle(app);
