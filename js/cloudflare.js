(function() {
  let isConnected = false;
  let baseUrl = localStorage.getItem("lf_cloudflare_url") || "";
  let onAuthStateChangedCallback = null;
  
  if (baseUrl) {
    // Remove trailing slash if present
    baseUrl = baseUrl.replace(/\/$/, "");
    isConnected = true;
  }

  // Helper to parse JWT payload client side
  function parseJwt(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  // Auth Operations Interface
  const cloudflareInterface = {
    isConnected: function() { return isConnected; },
    getBaseUrl: function() { return baseUrl; },
    
    saveConfig: function(url) {
      if (url) {
        localStorage.setItem("lf_cloudflare_url", url);
        window.location.reload();
        return true;
      }
      return false;
    },

    clearConfig: function() {
      localStorage.removeItem("lf_cloudflare_url");
      localStorage.removeItem("lf_jwt_token");
      window.location.reload();
    },

    signInWithGoogle: function(responseCredential) {
      if (isConnected) {
        return fetch(`${baseUrl}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: responseCredential })
        })
        .then(res => {
          if (!res.ok) throw new ResponseError(res);
          return res.json();
        })
        .then(data => {
          localStorage.setItem("lf_jwt_token", data.token);
          const user = {
            uid: parseJwt(data.token).uid,
            displayName: data.name || data.email.split("@")[0],
            email: data.email,
            photoURL: data.photoURL
          };
          if (onAuthStateChangedCallback) {
            onAuthStateChangedCallback(user);
          }
          return { user };
        });
      } else {
        // Mock Google Login Sandbox
        return simulateMockLogin("Google User", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80");
      }
    },

    signInWithEmail: function(email, password) {
      if (isConnected) {
        return fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        })
        .then(res => {
          if (!res.ok) return res.json().then(e => { throw new Error(e.error || "Login failed") });
          return res.json();
        })
        .then(data => {
          localStorage.setItem("lf_jwt_token", data.token);
          const payload = parseJwt(data.token);
          const user = {
            uid: payload.uid,
            email: data.email,
            displayName: data.email.split("@")[0],
            photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
          };
          if (onAuthStateChangedCallback) {
            onAuthStateChangedCallback(user);
          }
          return { user };
        });
      } else {
        // Mock Login Sandbox
        return simulateMockLogin(email.split("@")[0], "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80");
      }
    },

    signUpWithEmail: function(email, password) {
      if (isConnected) {
        return fetch(`${baseUrl}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        })
        .then(res => {
          if (!res.ok) return res.json().then(e => { throw new Error(e.error || "Registration failed") });
          return res.json();
        })
        .then(data => {
          localStorage.setItem("lf_jwt_token", data.token);
          const payload = parseJwt(data.token);
          const user = {
            uid: payload.uid,
            email: data.email,
            displayName: data.email.split("@")[0],
            photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80"
          };
          if (onAuthStateChangedCallback) {
            onAuthStateChangedCallback(user);
          }
          return { user };
        });
      } else {
        // Mock Signup Sandbox
        return simulateMockLogin(email.split("@")[0], "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80");
      }
    },

    signOut: function() {
      localStorage.removeItem("lf_jwt_token");
      localStorage.removeItem("lf_mock_user");
      if (onAuthStateChangedCallback) {
        onAuthStateChangedCallback(null);
      }
      return Promise.resolve();
    },

    onAuthStateChanged: function(callback) {
      onAuthStateChangedCallback = callback;
      
      if (isConnected) {
        const token = localStorage.getItem("lf_jwt_token");
        if (token) {
          const payload = parseJwt(token);
          if (payload) {
            // Check token expiration (if exp claim exists)
            if (payload.exp && Date.now() >= payload.exp * 1000) {
              console.warn("JWT token expired, logging out.");
              this.signOut();
              return;
            }
            callback({
              uid: payload.uid,
              email: payload.email,
              displayName: payload.name || payload.email.split("@")[0],
              photoURL: payload.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            });
            return;
          }
        }
        callback(null);
      } else {
        // Mock Login State check
        const mockUser = localStorage.getItem("lf_mock_user");
        if (mockUser) {
          callback(JSON.parse(mockUser));
        } else {
          callback(null);
        }
      }
    },

    // Sync state
    syncData: function(state) {
      if (isConnected) {
        const token = localStorage.getItem("lf_jwt_token");
        if (!token) return Promise.resolve();

        const cleanState = {
          habits: state.habits,
          tasks: state.tasks,
          goals: state.goals,
          events: state.events,
          journal: state.journal,
          favoriteQuotes: state.favoriteQuotes,
          streak: state.streak,
          longestStreak: state.longestStreak
        };

        return fetch(`${baseUrl}/api/data`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ data: cleanState })
        })
        .then(res => {
          if (!res.ok) console.warn("Cloud synchronization upload failed.");
          return res.json();
        })
        .then(() => console.log("Cloud sync successful!"))
        .catch(err => console.error("Cloud sync failed: ", err));
      } else {
        console.log("Saving state locally (No Cloudflare Worker URL configured).");
        return Promise.resolve();
      }
    },

    fetchData: function() {
      if (isConnected) {
        const token = localStorage.getItem("lf_jwt_token");
        if (!token) return Promise.resolve(null);

        return fetch(`${baseUrl}/api/data`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        .then(res => {
          if (!res.ok) return null;
          return res.json();
        })
        .then(resData => {
          if (resData && resData.data) {
            return resData.data;
          }
          return null;
        })
        .catch(err => {
          console.error("Failed to fetch cloud database: ", err);
          return null;
        });
      }
      return Promise.resolve(null);
    }
  };

  function simulateMockLogin(displayName, avatar) {
    const mockUser = {
      uid: "mock_user_123",
      displayName: displayName,
      email: displayName.toLowerCase().replace(" ", "") + "@lifeflow.io",
      photoURL: avatar
    };
    localStorage.setItem("lf_mock_user", JSON.stringify(mockUser));
    if (onAuthStateChangedCallback) {
      onAuthStateChangedCallback(mockUser);
    }
    return Promise.resolve({ user: mockUser });
  }

  function ResponseError(response) {
    this.name = "ResponseError";
    this.status = response.status;
    this.message = `HTTP request failed with status: ${response.status}`;
  }
  ResponseError.prototype = Error.prototype;

  // Export to global window namespace
  window.LifeFlowCloudflare = cloudflareInterface;
})();
