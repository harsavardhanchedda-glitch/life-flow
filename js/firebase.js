(function() {
  let isConnected = false;
  let auth = null;
  let db = null;
  
  // Default User-provided Firebase Configuration
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDPrUZEGTTMh-7aqWIRVstJBePCeqi1Rak",
    authDomain: "life-flow-dd5d6.firebaseapp.com",
    projectId: "life-flow-dd5d6",
    storageBucket: "life-flow-dd5d6.firebasestorage.app",
    messagingSenderId: "150966246207",
    appId: "1:150966246207:web:6774bd4dc80f7632de518a",
    measurementId: "G-7QN3C8WSN2"
  };

  // Load config (prioritize localStorage, fallback to DEFAULT)
  let savedConfig = DEFAULT_FIREBASE_CONFIG;
  try {
    const localConfig = localStorage.getItem("lf_firebase_config");
    if (localConfig) {
      savedConfig = JSON.parse(localConfig);
    }
  } catch (e) {
    console.warn("No saved config in localStorage, loading default user config.");
  }

  // Helper to initialize Firebase
  function initFirebase(config) {
    if (!config || !config.apiKey) return false;
    try {
      if (firebase.apps.length === 0) {
        firebase.initializeApp(config);
      }
      auth = firebase.auth();
      db = firebase.firestore();
      isConnected = true;
      console.log("Firebase initialized successfully!");
      return true;
    } catch (e) {
      console.error("Firebase init failed: ", e);
      return false;
    }
  }

  if (savedConfig) {
    initFirebase(savedConfig);
  }

  // Auth Operations Interface
  const firebaseInterface = {
    isConnected: function() { return isConnected; },
    
    saveConfig: function(configStr) {
      try {
        const config = JSON.parse(configStr);
        if (config && config.apiKey && config.projectId) {
          localStorage.setItem("lf_firebase_config", JSON.stringify(config));
          // Reload page to reinitialize
          window.location.reload();
          return true;
        }
      } catch (e) {
        alert("Invalid JSON config format.");
      }
      return false;
    },

    clearConfig: function() {
      localStorage.removeItem("lf_firebase_config");
      window.location.reload();
    },

    signInWithGoogle: function() {
      if (isConnected && auth) {
        const provider = new firebase.auth.GoogleAuthProvider();
        return auth.signInWithPopup(provider);
      } else {
        // Mock Login
        console.log("Simulating Google Login...");
        return simulateMockLogin("Google User", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80");
      }
    },

    signInWithEmail: function(email, password) {
      if (isConnected && auth) {
        return auth.signInWithEmailAndPassword(email, password);
      } else {
        // Mock Login
        console.log("Simulating Email Login...");
        return simulateMockLogin(email.split("@")[0], "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80");
      }
    },

    signUpWithEmail: function(email, password) {
      if (isConnected && auth) {
        return auth.createUserWithEmailAndPassword(email, password);
      } else {
        // Mock signup
        console.log("Simulating Email Signup...");
        return simulateMockLogin(email.split("@")[0], "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80");
      }
    },

    signOut: function() {
      if (isConnected && auth) {
        return auth.signOut();
      } else {
        // Clear mock user
        localStorage.removeItem("lf_mock_user");
        if (this.onAuthStateChangedCallback) {
          this.onAuthStateChangedCallback(null);
        }
        return Promise.resolve();
      }
    },

    onAuthStateChanged: function(callback) {
      this.onAuthStateChangedCallback = callback;
      if (isConnected && auth) {
        auth.onAuthStateChanged(callback);
      } else {
        // Check mock user
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
      if (isConnected && db && auth && auth.currentUser) {
        const uid = auth.currentUser.uid;
        // Clean state listeners or functions before saving
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
        return db.collection("users").doc(uid).set({
          data: cleanState,
          lastSynced: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(() => console.log("Cloud sync successful!"))
        .catch(err => console.error("Cloud sync failed: ", err));
      } else {
        console.log("Saving state locally (No Firebase connection active).");
        return Promise.resolve();
      }
    },

    fetchData: function() {
      if (isConnected && db && auth && auth.currentUser) {
        const uid = auth.currentUser.uid;
        return db.collection("users").doc(uid).get()
        .then(doc => {
          if (doc.exists && doc.data().data) {
            return doc.data().data;
          }
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
    if (firebaseInterface.onAuthStateChangedCallback) {
      firebaseInterface.onAuthStateChangedCallback(mockUser);
    }
    return Promise.resolve({ user: mockUser });
  }

  // Decode Google JWT payload client side
  function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  }

  // Google GSI Pop Up Sign In Callback
  window.handleGoogleCredentialResponse = function(response) {
    try {
      const payload = decodeJwtResponse(response.credential);
      console.log("GSI Authenticated Google Account:", payload.email);

      const googleUser = {
        uid: "google_" + payload.sub,
        displayName: payload.name,
        email: payload.email,
        photoURL: payload.picture
      };

      // If connected to Firebase, sign in securely with GSI ID Token
      if (isConnected && auth) {
        const credential = firebase.auth.GoogleAuthProvider.credential(response.credential);
        auth.signInWithCredential(credential)
          .then(result => {
            console.log("Firebase signed in successfully with Google Credential!");
            alert("Welcome, " + result.user.displayName + "!");
            if (window.closeLoginModal) window.closeLoginModal();
          })
          .catch(err => {
            console.error("Firebase GSI sign in failed:", err);
            if (err.code === "auth/unauthorized-domain") {
              alert("Authorization Error: This domain (localhost) is not authorized in your Firebase project.\n\nTo fix this:\n1. Go to your Firebase Console (console.firebase.google.com)\n2. Navigate to Authentication -> Settings -> Authorized Domains\n3. Click 'Add Domain' and add 'localhost'\n4. Refresh the page and try logging in again!");
            } else {
              alert("Firebase Google Sign-In error: " + err.message);
            }
          });
        return;
      }

      // Fallback/Mock storage
      localStorage.setItem("lf_mock_user", JSON.stringify(googleUser));

      // Sync settings
      if (window.LifeFlowStore) {
        window.LifeFlowStore.state.profile.name = googleUser.displayName;
        window.LifeFlowStore.state.profile.avatar = googleUser.photoURL;
        window.LifeFlowStore.save();
      }

      // Fire listener to update UI
      if (firebaseInterface.onAuthStateChangedCallback) {
        firebaseInterface.onAuthStateChangedCallback(googleUser);
      }

      alert("Welcome, " + googleUser.displayName + "!");
      
      // Close the modal
      if (window.closeLoginModal) {
        window.closeLoginModal();
      }
    } catch (e) {
      console.error("Failed to parse Google OAuth Token:", e);
      alert("Google Sign-In failed. Please try again.");
    }
  };

  // Export to window
  window.LifeFlowFirebase = firebaseInterface;
})();
