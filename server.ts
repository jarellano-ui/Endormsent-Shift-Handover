import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // Migration logic: If db.json exists, try to push data to Supabase if it's empty
  const migrateLocalData = async () => {
    const DB_FILE = path.join(__dirname, "data", "db.json");
    if (fs.existsSync(DB_FILE)) {
      try {
        console.log("Found local db.json. Checking if Supabase migration is needed...");
        const db = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
        
        // Check if users table is empty
        const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
        
        if (error) {
          console.error("Migration check failed:", error.message);
          console.log("TIP: This usually means you haven't run the SQL setup in the Supabase SQL Editor yet.");
        } else if (count && count > 0) {
          console.log("Supabase already has users. Skipping migration to prevent overwriting existing data.");
        } else {
          console.log("Supabase is empty. Migrating local data...");
          
          if (db.users?.length) await supabase.from('users').insert(db.users);
          if (db.tasks?.length) await supabase.from('tasks').insert(db.tasks);
          if (db.handovers?.length) await supabase.from('handovers').insert(db.handovers);
          if (db.notifications?.length) await supabase.from('notifications').insert(db.notifications);
          if (db.feedback?.length) await supabase.from('feedback').insert(db.feedback);
          
          console.log("Migration complete!");
        }
      } catch (err) {
        console.error("Migration failed:", err);
      }
    }
  };

  if (SUPABASE_URL && SUPABASE_KEY) {
    await migrateLocalData();
  } else {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Database operations will fail.");
  }

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  };

  // API Routes
  app.get("/api/auth/me", (req, res) => {
    const session = req.cookies.user_session;
    if (session) {
      try {
        res.json(JSON.parse(session));
      } catch {
        res.status(401).json({ error: "Invalid session" });
      }
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    res.clearCookie("user_session", {
      secure: true,
      sameSite: "none",
      httpOnly: true
    });
    res.json({ status: "ok" });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position || (user.role === 'ADMIN' ? 'IT Administrator' : 'IT Personnel'),
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4A773C&color=fff`
    };

    res.cookie("user_session", JSON.stringify(sessionUser), {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    });
    res.json(sessionUser);
  });

  app.get("/api/users", async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, position, createdAt');
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/users/:id", async (req, res) => {
    const session = req.cookies.user_session;
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    
    const sessionData = JSON.parse(session);
    const targetId = req.params.id;
    
    if (sessionData.role !== 'ADMIN' && sessionData.id !== targetId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, email, position, password, role } = req.body;
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (position) updates.position = position;
    if (password) updates.password = password;
    if (sessionData.role === 'ADMIN' && role) updates.role = role;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', targetId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    if (sessionData.id === targetId) {
      const updatedSession = { 
        ...sessionData, 
        name: data.name, 
        email: data.email, 
        position: data.position,
        role: data.role
      };
      res.cookie("user_session", JSON.stringify(updatedSession), {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.json(updatedSession);
    }

    const { password: _, ...safeUser } = data;
    res.json(safeUser);
  });

  app.post("/api/users", async (req, res) => {
    const newUser = {
      id: generateId(),
      ...req.body
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "User with this email already exists" });
      return res.status(500).json({ error: error.message });
    }

    const { password, ...safeUser } = data;
    res.json(safeUser);
  });

  app.delete("/api/users/:id", async (req, res) => {
    const session = req.cookies.user_session;
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    const sessionData = JSON.parse(session);
    
    if (sessionData.role !== 'ADMIN') {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: "ok" });
  });

  app.get("/api/handovers", async (req, res) => {
    const { data, error } = await supabase
      .from('handovers')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/handovers", async (req, res) => {
    const newHandover = {
      ...req.body,
      id: generateId()
    };
    
    const { error } = await supabase
      .from('handovers')
      .insert([newHandover]);

    if (error) return res.status(500).json({ error: error.message });

    // Create notification
    const notification = {
      id: generateId(),
      type: 'handover',
      title: 'New Endorsement Matrix',
      message: `${newHandover.fromShift} to ${newHandover.toShift} Shift Endorsement`,
      timestamp: Date.now(),
      readBy: [],
      assignedToUserIds: Array.isArray(newHandover.endorsedTo) ? newHandover.endorsedTo : (newHandover.endorsedTo ? [newHandover.endorsedTo] : []),
      linkView: 'handover'
    };
    
    await supabase.from('notifications').insert([notification]);

    res.json(newHandover);
  });

  app.put("/api/handovers", async (req, res) => {
    // This endpoint seems to replace all handovers, which is unusual for a DB.
    // Usually we update a specific one. But let's keep the logic or adapt it.
    // Frontend seems to send the full list.
    const handovers = req.body;
    if (Array.isArray(handovers)) {
      for (const h of handovers) {
        await supabase.from('handovers').upsert(h);
      }
    }
    res.json({ status: "ok" });
  });

  app.get("/api/tasks", async (req, res) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('createdAt', { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/tasks", async (req, res) => {
    const newTasks = req.body;
    
    if (Array.isArray(newTasks)) {
      // Get existing tasks to identify new ones for notifications
      const { data: existingTasks } = await supabase.from('tasks').select('id');
      const existingIds = new Set((existingTasks || []).map(t => t.id));

      for (const t of newTasks) {
        const { error } = await supabase.from('tasks').upsert(t);
        
        if (!error && !existingIds.has(t.id)) {
          // New task notification
          await supabase.from('notifications').insert([{
            id: generateId(),
            type: 'task',
            title: 'New Task Assigned',
            message: `${t.title}`,
            timestamp: Date.now(),
            readBy: [],
            assignedToUserIds: Array.isArray(t.assignedTo) ? t.assignedTo : (t.assignedTo ? [t.assignedTo] : []),
            linkView: 'tasks'
          }]);
        }
      }
    }

    res.json({ status: "ok" });
  });

  app.get("/api/notifications", async (req, res) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50);
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/notifications/read", async (req, res) => {
    const session = req.cookies.user_session;
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    const sessionData = JSON.parse(session);
    
    const { notificationId } = req.body;
    
    if (notificationId === 'all') {
      const { data: notifications } = await supabase.from('notifications').select('*');
      if (notifications) {
        for (const n of notifications) {
          if (!n.readBy.includes(sessionData.id)) {
            const updatedReadBy = [...n.readBy, sessionData.id];
            await supabase.from('notifications').update({ readBy: updatedReadBy }).eq('id', n.id);
          }
        }
      }
    } else {
      const { data: n } = await supabase.from('notifications').select('*').eq('id', notificationId).single();
      if (n && !n.readBy.includes(sessionData.id)) {
        const updatedReadBy = [...n.readBy, sessionData.id];
        await supabase.from('notifications').update({ readBy: updatedReadBy }).eq('id', n.id);
      }
    }
    
    res.json({ status: "ok" });
  });

  app.get("/api/feedback", async (req, res) => {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('timestamp', { ascending: false });
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  app.post("/api/feedback", async (req, res) => {
    const newFeedback = {
      ...req.body,
      id: generateId(),
      timestamp: Date.now(),
      status: 'new'
    };
    
    const { error } = await supabase.from('feedback').insert([newFeedback]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(newFeedback);
  });

  app.put("/api/feedback/:id", async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('feedback')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.get("/api/proxy-sheet", async (req, res) => {
    const month = req.query.month as string;
    if (!month) {
      return res.status(400).json({ error: "Month parameter is required" });
    }

    const sheetId = '11KIs2UlpayQn6ugWVtJETxE8ZjEH00uqgHBkgNFnQ9o';
    const baseUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq`;
    const url = `${baseUrl}?tqx=out:csv&sheet=${encodeURIComponent(month.toUpperCase())}`;

    try {
      const response = await fetch(url);
      
      if (response.status === 401 || response.status === 403) {
        return res.status(401).json({ 
          error: "Access Denied (401). Please ensure your Spreadsheet is shared as 'Anyone with the link can view' AND 'Published to web' as a CSV.",
        });
      }

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: `Google Sheets error: ${response.status}`, details: text.substring(0, 100) });
      }
      const data = await response.text();
      res.header("Content-Type", "text/csv");
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch spreadsheet data from Google" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
