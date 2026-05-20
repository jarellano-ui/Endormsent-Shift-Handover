import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Initialize Supabase only if keys are present
let supabase: any;
try {
  if (SUPABASE_URL && SUPABASE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
} catch (err) {
  console.error("Failed to initialize Supabase client:", err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  const sessionSecret = process.env.SESSION_SECRET || "hc_endorsement_matrix_secret_2024";
  app.use(cookieParser(sessionSecret));

  // Supabase availability check middleware
  app.use("/api", (req, res, next) => {
    if (req.path === "/debug/supabase-status" || req.path === "/auth/me") return next();
    
    if (!supabase) {
      return res.status(503).json({ 
        error: "Database service unavailable", 
        message: "Supabase client is not initialized. Check server Environment Variables.",
        hint: "Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
      });
    }
    next();
  });

  // Migration logic: If db.json exists, try to push data to Supabase if it's empty
  const migrateLocalData = async () => {
    const rootDir = process.cwd();
    const DB_FILE = path.join(rootDir, "data", "db.json");
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

  if (supabase) {
    // Migration logic in background
    migrateLocalData().catch(err => console.error("Background migration failed:", err));
  } else {
    console.warn("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Database operations will fail.");
    console.warn("Please set these environment variables in your .env file or platform settings.");
  }

  const generateId = () => {
    return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  };

  // Simple in-memory cache to reduce Supabase load and avoid 429s from polling/concurrency
  const apiCache = new Map<string, { data: any, timestamp: number }>();
  const CACHE_TTL = 5000; // 5 seconds cache

  const getCachedData = async (key: string, fetcher: () => Promise<any>) => {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    const data = await fetcher();
    apiCache.set(key, { data, timestamp: Date.now() });
    return data;
  };

  const invalidateCache = (key: string) => {
    apiCache.delete(key);
  };

  // Middleware for Authentication
  const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const session = req.signedCookies.user_session;
    if (!session) {
      console.warn(`Auth failed for ${req.path}: No session cookie found.`);
      return res.status(401).json({ error: "Unauthorized: Please log in." });
    }
    req.user = session;
    next();
  };

  // Middleware for Admin Access
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Forbidden: Administrator privileges required." });
    }
    next();
  };

  // API Routes
  app.get("/api/debug/supabase-status", async (req, res) => {
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (error) throw error;
      res.json({ 
        status: "connected", 
        message: "Successfully reached Supabase", 
        userCount: data || 0 
      });
    } catch (err: any) {
      res.status(500).json({ 
        status: "error", 
        message: "Failed to connect to Supabase", 
        error: err.message,
        tip: "Ensure you have run the SQL script in SUPABASE_SETUP.sql in your Supabase SQL Editor."
      });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const session = req.signedCookies.user_session;
    if (session) {
      res.json(session);
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  });

  app.get("/api/auth/logout", (req, res) => {
    res.clearCookie("user_session", {
      secure: true,
      sameSite: "none",
      httpOnly: true,
      signed: true
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

    res.cookie("user_session", sessionUser, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
    });
    res.json(sessionUser);
  });

  app.get("/api/users", requireAuth, async (req, res) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, position, createdAt');
      
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  app.put("/api/users/:id", requireAuth, async (req, res) => {
    const sessionData = req.user;
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
      res.cookie("user_session", updatedSession, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        signed: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      return res.json(updatedSession);
    }

    const { password: _, ...safeUser } = data;
    res.json(safeUser);
  });

  app.post("/api/users", requireAuth, requireAdmin, async (req, res) => {
    const { role, ...rest } = req.body;
    
    // Safety check: ensure only admins can create admin accounts
    // (though requireAdmin already restricts the whole route)
    const newUser = {
      id: generateId(),
      ...rest,
      role: role || 'USER'
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

  app.delete("/api/users/:id", requireAuth, requireAdmin, async (req, res) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
    
    if (error) return res.status(500).json({ error: error.message });
    res.json({ status: "ok" });
  });

  app.get("/api/handovers", requireAuth, async (req, res) => {
    try {
      const data = await getCachedData('handovers', async () => {
        const { data, error } = await supabase
          .from('handovers')
          .select('*')
          .is('deletedAt', null)
          .order('timestamp', { ascending: false });
          
        if (error) {
          console.error("Error fetching handovers from Supabase:", error.message);
          throw error;
        }
        return data || [];
      });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching handovers:", error.message);
      res.status(500).json({ error: error.message, hint: "Missing deletedAt column? Run the SQL update." });
    }
  });

  app.post("/api/handovers", requireAuth, async (req, res) => {
    const newHandover = {
      ...req.body,
      id: generateId()
    };
    
    const { error } = await supabase
      .from('handovers')
      .insert([newHandover]);

    if (error) return res.status(500).json({ error: error.message });

    invalidateCache('handovers');
    invalidateCache('notifications');

    // Create notification in a background-safe way
    try {
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
    } catch (notifErr) {
      console.error("Failed to create handover notification:", notifErr);
    }

    res.json(newHandover);
  });

  app.put("/api/handovers", requireAuth, async (req, res) => {
    const sessionData = req.user;

    const handovers = req.body;
    if (Array.isArray(handovers)) {
      const { data: existingHandovers } = await supabase.from('handovers').select('id').is('deletedAt', null);
      const existingIds = new Set((existingHandovers || []).map(h => h.id));
      const incomingIds = new Set(handovers.map(h => h.id));

      // Security Check: Deletions restricted to ADMIN
      if (sessionData.role !== 'ADMIN') {
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            return res.status(403).json({ error: "Personnel are not permitted to delete endorsements." });
          }
        }
      }

      // Sync
      if (sessionData.role === 'ADMIN') {
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            await supabase.from('handovers').update({ deletedAt: Date.now() }).eq('id', existingId);
          }
        }
      }

      for (const h of handovers) {
        await supabase.from('handovers').upsert(h);
      }
      invalidateCache('handovers');
    }
    res.json({ status: "ok" });
  });

  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const data = await getCachedData('tasks', async () => {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .is('deletedAt', null)
          .order('createdAt', { ascending: false });
          
        if (error) {
          console.error("Error fetching tasks from Supabase:", error.message);
          throw error;
        }
        return data || [];
      });
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching tasks:", error.message);
      res.status(500).json({ error: error.message, hint: "Missing deletedAt column? Run the SQL update." });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    const sessionData = req.user;
    
    const newTasks = req.body;
    
    if (Array.isArray(newTasks)) {
      // Get existing tasks to identify new ones for notifications/deletions
      const { data: existingTasks } = await supabase.from('tasks').select('id').is('deletedAt', null);
      const existingIds = new Set((existingTasks || []).map(t => t.id));
      const incomingIds = new Set(newTasks.map(t => t.id));

      // Security Check: If items are missing from incoming list, it's a deletion.
      // Personnel should not be able to delete.
      if (sessionData.role !== 'ADMIN') {
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            return res.status(403).json({ error: "Personnel are not permitted to delete tasks. Please contact an Administrator." });
          }
        }
      }

      // Handle Sync
      // First, mark ones as deleted that were removed if user is ADMIN
      if (sessionData.role === 'ADMIN') {
        for (const existingId of existingIds) {
          if (!incomingIds.has(existingId)) {
            await supabase.from('tasks').update({ deletedAt: Date.now() }).eq('id', existingId);
          }
        }
      }

      for (const t of newTasks) {
        const { error } = await supabase.from('tasks').upsert(t);
        
        if (!error && !existingIds.has(t.id)) {
          // New task notification - wrap in try-catch to be safe
          try {
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
          } catch (notifErr) {
            console.error("Failed to create task notification:", notifErr);
          }
        }
      }
      invalidateCache('tasks');
      invalidateCache('notifications');
    }

    res.json({ status: "ok" });
  });

  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const data = await getCachedData('notifications', async () => {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50);
          
        if (error) {
          console.error("Supabase error fetching notifications:", error);
          throw error;
        }
        return data || [];
      });
      res.json(data);
    } catch (err: any) {
      console.error("Unexpected error fetching notifications:", err);
      res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
  });

  app.post("/api/notifications/read", requireAuth, async (req, res) => {
    const sessionData = req.user;
    
    const { notificationId } = req.body;
    
    if (notificationId === 'all') {
      const { data: notifications } = await supabase.from('notifications').select('*');
      if (notifications) {
        for (const n of notifications) {
          const currentReadBy = Array.isArray(n.readBy) ? n.readBy : [];
          if (!currentReadBy.includes(sessionData.id)) {
            const updatedReadBy = [...currentReadBy, sessionData.id];
            await supabase.from('notifications').update({ readBy: updatedReadBy }).eq('id', n.id);
          }
        }
      }
    } else {
      const { data: n } = await supabase.from('notifications').select('*').eq('id', notificationId).single();
      if (n) {
        const currentReadBy = Array.isArray(n.readBy) ? n.readBy : [];
        if (!currentReadBy.includes(sessionData.id)) {
          const updatedReadBy = [...currentReadBy, sessionData.id];
          await supabase.from('notifications').update({ readBy: updatedReadBy }).eq('id', notificationId);
        }
      }
      invalidateCache('notifications');
    }
    
    res.json({ status: "ok" });
  });

  app.get("/api/feedback", requireAuth, async (req, res) => {
    try {
      const data = await getCachedData('feedback', async () => {
        const { data, error } = await supabase
          .from('feedback')
          .select('*')
          .is('deletedAt', null)
          .order('timestamp', { ascending: false });
          
        if (error) throw error;
        return data || [];
      });
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/feedback", requireAuth, async (req, res) => {
    const newFeedback = {
      ...req.body,
      id: generateId(),
      timestamp: Date.now(),
      status: 'new'
    };
    
    const { error } = await supabase.from('feedback').insert([newFeedback]);
    if (error) return res.status(500).json({ error: error.message });
    invalidateCache('feedback');
    res.json(newFeedback);
  });

  app.put("/api/feedback/:id", requireAuth, async (req, res) => {
    const sessionData = req.user;

    if (sessionData.role !== 'ADMIN') {
      return res.status(403).json({ error: "Only Admins can update feedback status" });
    }

    const { id } = req.params;
    const { data, error } = await supabase
      .from('feedback')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
      
    if (error) return res.status(500).json({ error: error.message });
    invalidateCache('feedback');
    res.json(data);
  });

  app.delete("/api/feedback/:id", requireAuth, async (req, res) => {
    const sessionData = req.user;

    if (sessionData.role !== 'ADMIN') {
      return res.status(403).json({ error: "Forbidden: Only Admins can delete feedback" });
    }

    const { error } = await supabase
      .from('feedback')
      .update({ deletedAt: Date.now() })
      .eq('id', req.params.id);
      
    if (error) return res.status(500).json({ error: error.message });
    invalidateCache('feedback');
    res.json({ status: "ok" });
  });

  app.get("/api/proxy-sheet", requireAuth, async (req, res) => {
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
    const distPath = path.join(process.cwd(), "dist");
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
