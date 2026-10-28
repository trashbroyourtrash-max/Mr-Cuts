export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }

    try {
      // Public: services
      if (url.pathname === "/api/services" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT id, name, description, price FROM services ORDER BY id DESC"
        ).all();
        return json(result.results);
      }

      // Admin: add service
      if (url.pathname === "/api/services" && request.method === "POST") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const body = await request.json();
        if (!body.name || body.price === undefined) {
          return json({error:"Name and price are required"}, 400);
        }
        const result = await env.DB.prepare(
          "INSERT INTO services (name, description, price) VALUES (?, ?, ?)"
        ).bind(body.name, body.description || "", Number(body.price)).run();
        return json({ok:true, id:result.meta.last_row_id}, 201);
      }

      // Admin: remove service
      if (url.pathname.startsWith("/api/services/") && request.method === "DELETE") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const id = url.pathname.split("/").pop();
        await env.DB.prepare("DELETE FROM services WHERE id=?").bind(id).run();
        return json({ok:true});
      }

      // Public: create booking
      if (url.pathname === "/api/bookings" && request.method === "POST") {
        const body = await request.json();
        if (!body.name || !body.phone || !body.date || !body.time || !body.service) {
          return json({error:"Please complete all booking fields"}, 400);
        }

        const existing = await env.DB.prepare(
          "SELECT id FROM bookings WHERE date=? AND time=? AND status IN ('pending','accepted')"
        ).bind(body.date, body.time).first();

        if (existing) return json({error:"That time is already booked"}, 409);

        const result = await env.DB.prepare(
          "INSERT INTO bookings (name,phone,date,time,service,status) VALUES (?,?,?,?,?,'pending')"
        ).bind(
          body.name, body.phone, body.date, body.time, body.service
        ).run();

        return json({ok:true, id:result.meta.last_row_id}, 201);
      }

      // Admin: see bookings
      if (url.pathname === "/api/bookings" && request.method === "GET") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const result = await env.DB.prepare(
          "SELECT * FROM bookings ORDER BY date ASC, time ASC"
        ).all();
        return json(result.results);
      }

      // Admin: accept/remove booking
      if (url.pathname.startsWith("/api/bookings/") && request.method === "PUT") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const id = url.pathname.split("/").pop();
        const body = await request.json();

        if (!["pending","accepted","removed"].includes(body.status)) {
          return json({error:"Invalid status"}, 400);
        }

        await env.DB.prepare(
          "UPDATE bookings SET status=? WHERE id=?"
        ).bind(body.status, id).run();

        return json({ok:true});
      }

      // Public: listings
      if (url.pathname === "/api/listings" && request.method === "GET") {
        const result = await env.DB.prepare(
          "SELECT * FROM listings ORDER BY id DESC"
        ).all();
        return json(result.results);
      }

      // Admin: add listing
      if (url.pathname === "/api/listings" && request.method === "POST") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const body = await request.json();

        if (!body.title) return json({error:"Title is required"}, 400);

        const result = await env.DB.prepare(
          "INSERT INTO listings (title,description,image_url) VALUES (?,?,?)"
        ).bind(
          body.title, body.description || "", body.image_url || ""
        ).run();

        return json({ok:true, id:result.meta.last_row_id}, 201);
      }

      // Admin: remove listing
      if (url.pathname.startsWith("/api/listings/") && request.method === "DELETE") {
        if (!admin(request, env)) return json({error:"Unauthorized"}, 401);
        const id = url.pathname.split("/").pop();

        await env.DB.prepare(
          "DELETE FROM listings WHERE id=?"
        ).bind(id).run();

        return json({ok:true});
      }

      // Admin login
      if (url.pathname === "/api/admin/login" && request.method === "POST") {
        const body = await request.json();

        if (
          body.email === env.ADMIN_EMAIL &&
          body.password === env.ADMIN_PASSWORD
        ) {
          return json({ok:true});
        }

        return json({ok:false, error:"Invalid email or password"}, 401);
      }

      return json({error:"Not found"}, 404);

    } catch (error) {
      return json({error:"Server error", detail:error.message}, 500);
    }
  }
};

function admin(request, env) {
  // Simple starter protection for the first deployment.
  // Replace with a proper session/auth system before public production use.
  const key = request.headers.get("X-Admin-Key");
  return key && key === env.ADMIN_PASSWORD;
}

function json(data, status=200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type":"application/json",
      "Access-Control-Allow-Origin":"*"
    }
  });
}
