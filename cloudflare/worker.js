// Cloudflare Workers Full-Stack Backend for LifeFlow App
// Uses Cloudflare KV for user credentials and state database storage

const JWT_SECRET = "lifeflow_edge_secret_token_128937128937"; // In production, bind this via wrangler secrets

addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  
  // Set CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400"
  };

  // Handle CORS preflight options request
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Email Register Route
    if (path === "/api/auth/register" && request.method === "POST") {
      const { email, password } = await request.json();
      if (!email || !password) {
        return errorResponse("Email and password are required.", 400, corsHeaders);
      }
      
      const emailLower = email.toLowerCase().trim();
      const existingUser = await LIFEFLOW_KV.get(`user:${emailLower}`);
      if (existingUser) {
        return errorResponse("User account already exists.", 400, corsHeaders);
      }

      const salt = crypto.randomUUID();
      const passwordHash = await hashPassword(password, salt);
      
      const userPayload = {
        email: emailLower,
        passwordHash,
        salt,
        createdAt: new Date().toISOString()
      };

      await LIFEFLOW_KV.put(`user:${emailLower}`, JSON.stringify(userPayload));
      
      const token = await signJwt({ email: emailLower, uid: "email_" + emailLower }, JWT_SECRET);
      return jsonResponse({ token, email: emailLower }, corsHeaders);
    }

    // 2. Email Login Route
    if (path === "/api/auth/login" && request.method === "POST") {
      const { email, password } = await request.json();
      if (!email || !password) {
        return errorResponse("Email and password are required.", 400, corsHeaders);
      }

      const emailLower = email.toLowerCase().trim();
      const userDataStr = await LIFEFLOW_KV.get(`user:${emailLower}`);
      if (!userDataStr) {
        return errorResponse("Invalid email or password.", 401, corsHeaders);
      }

      const user = JSON.parse(userDataStr);
      const computedHash = await hashPassword(password, user.salt);
      
      if (computedHash !== user.passwordHash) {
        return errorResponse("Invalid email or password.", 401, corsHeaders);
      }

      const token = await signJwt({ email: emailLower, uid: "email_" + emailLower }, JWT_SECRET);
      return jsonResponse({ token, email: emailLower }, corsHeaders);
    }

    // 3. Google Sign-In verification Route
    if (path === "/api/auth/google" && request.method === "POST") {
      const { credential } = await request.json();
      if (!credential) {
        return errorResponse("Google token is required.", 400, corsHeaders);
      }

      // Decode Google JWT payload client side or serverless side
      const parts = credential.split('.');
      if (parts.length !== 3) {
        return errorResponse("Invalid Google token format.", 400, corsHeaders);
      }

      const payload = JSON.parse(base64UrlDecode(parts[1]));
      if (!payload.email) {
        return errorResponse("Invalid Google token payload details.", 400, corsHeaders);
      }

      const emailLower = payload.email.toLowerCase().trim();
      
      // Auto register google user in our logs if missing
      const existingUser = await LIFEFLOW_KV.get(`user:${emailLower}`);
      if (!existingUser) {
        const googleUserPayload = {
          email: emailLower,
          googleId: payload.sub,
          displayName: payload.name,
          photoURL: payload.picture,
          createdAt: new Date().toISOString()
        };
        await LIFEFLOW_KV.put(`user:${emailLower}`, JSON.stringify(googleUserPayload));
      }

      // Sign JWT session token
      const token = await signJwt({ 
        email: emailLower, 
        uid: "google_" + payload.sub,
        name: payload.name,
        photoURL: payload.picture
      }, JWT_SECRET);

      return jsonResponse({ 
        token, 
        email: emailLower, 
        name: payload.name, 
        photoURL: payload.picture 
      }, corsHeaders);
    }

    // --- SECURED DATA SYNC ROUTES ---
    if (path === "/api/data") {
      const authHeader = request.headers.get("Authorization");
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return errorResponse("Unauthorized: Missing bearer token.", 401, corsHeaders);
      }

      const token = authHeader.split(" ")[1];
      const verified = await verifyJwt(token, JWT_SECRET);
      if (!verified) {
        return errorResponse("Unauthorized: Invalid session token.", 401, corsHeaders);
      }

      const userEmail = verified.email;

      // GET data
      if (request.method === "GET") {
        const data = await LIFEFLOW_KV.get(`data:${userEmail}`);
        if (!data) {
          return jsonResponse({ data: null }, corsHeaders);
        }
        return jsonResponse({ data: JSON.parse(data) }, corsHeaders);
      }

      // POST data
      if (request.method === "POST") {
        const { data } = await request.json();
        if (!data) {
          return errorResponse("Data payload is required.", 400, corsHeaders);
        }

        await LIFEFLOW_KV.put(`data:${userEmail}`, JSON.stringify(data));
        return jsonResponse({ success: true, message: "Sync complete!" }, corsHeaders);
      }
    }

    return errorResponse("Route Not Found.", 404, corsHeaders);
    
  } catch (err) {
    return errorResponse("Internal Server Error: " + err.message, 500, corsHeaders);
  }
}

// --- UTILITY HELPER IMPLEMENTATIONS ---

function jsonResponse(data, headers) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

function errorResponse(message, status, headers) {
  return new Response(JSON.stringify({ error: message }), {
    status: status,
    headers: { ...headers, "Content-Type": "application/json" }
  });
}

// Password cryptography hashing helper
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple Web Crypto JWT Signer / Verifier
async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const base64UrlHeader = base64UrlEncode(JSON.stringify(header));
  const base64UrlPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${base64UrlHeader}.${base64UrlPayload}`;
  
  const signature = await hmacSha256(signatureInput, secret);
  return `${signatureInput}.${signature}`;
}

async function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [header, payload, signature] = parts;
  const signatureInput = `${header}.${payload}`;
  const expectedSignature = await hmacSha256(signatureInput, secret);
  
  if (signature === expectedSignature) {
    const payloadStr = base64UrlDecode(payload);
    return JSON.parse(payloadStr);
  }
  return null;
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  const binString = String.fromCharCode(...bytes);
  return btoa(binString).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binString = atob(str);
  const bytes = Uint8Array.from(binString, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function hmacSha256(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
