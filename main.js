/**
 * Main Process for FirestoreXplorer
 *
 * This file handles the backend logic for the Electron app, including:
 * - Creating and managing the application window.
 * - Handling all interactions with the Firebase Admin SDK.
 * - Responding to events from the renderer process (the UI).
 */

// --- Dependencies ---
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const admin = require("firebase-admin");

// --- Global Variables ---
let mainWindow;

/**
 * Creates the main application window.
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, "imgs/icon.png"), // Sets the app icon
    autoHideMenuBar: true, // Hides the default menu bar (File, Edit, etc.)
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Securely bridge main and renderer processes
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Load the app's main HTML file.
  mainWindow.loadFile("index.html");
}

// --- Electron App Lifecycle Events ---

// Create the window when the app is ready.
app.whenReady().then(createWindow);

// Quit the app when all windows are closed (except on macOS).
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Re-create the window if the dock icon is clicked (on macOS).
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- Firebase Initialization ---

/**
 * Initializes the Firebase Admin SDK with a service account.
 * Deletes any previous app instance to ensure a clean connection.
 * @param {object} serviceAccount - The parsed JSON from the service account file.
 * @returns {Promise<object>} A promise that resolves with the project ID on success.
 */
async function initializeFirebase(serviceAccount) {
  if (admin.apps.length > 0) {
    await admin.app().delete();
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  return { success: true, projectId: serviceAccount.project_id };
}

// --- IPC Handlers (Communication with Renderer Process) ---

/**
 * Handles the 'load-service-account-file' event.
 * Opens a file dialog for the user to select a service account JSON file.
 */
ipcMain.handle("load-service-account-file", async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ name: "JSON", extensions: ["json"] }],
  });
  if (!filePaths || filePaths.length === 0) {
    return { success: false, error: "No file selected." };
  }

  try {
    const filePath = filePaths[0];
    const serviceAccountContent = fs.readFileSync(filePath, "utf8");
    const serviceAccount = JSON.parse(serviceAccountContent);
    const result = await initializeFirebase(serviceAccount);
    return { ...result, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Handles the 'load-service-account-path' event.
 * Loads a project from a previously saved file path.
 */
ipcMain.handle("load-service-account-path", async (_, filePath) => {
  try {
    const serviceAccountContent = fs.readFileSync(filePath, "utf8");
    const serviceAccount = JSON.parse(serviceAccountContent);
    return await initializeFirebase(serviceAccount);
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Fetches the list of top-level collections from Firestore.
 */
ipcMain.handle("get-collections", async () => {
  if (admin.apps.length === 0)
    return { success: false, error: "Firebase not initialized." };
  try {
    const collections = await admin.firestore().listCollections();
    return { success: true, collections: collections.map((c) => c.id) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Fetches documents from a collection, with support for searching and pagination.
 */
ipcMain.handle(
  "get-documents",
  async (_, { collectionId, lastVisible, searchQuery }) => {
    if (admin.apps.length === 0)
      return { success: false, error: "Firebase not initialized." };
    try {
      let query = admin.firestore().collection(collectionId);
      let clientSideFilter = null;
      let operator = null;

      // Build the search query if search parameters are provided.
      if (searchQuery && searchQuery.key && searchQuery.value) {
        let { key, value } = searchQuery;
        operator = searchQuery.operator;

        // Try to convert value to a number for non-LIKE queries.
        if (operator !== "LIKE" && !isNaN(value) && !isNaN(parseFloat(value))) {
          value = parseFloat(value);
        }

        // Handle special case for searching by Document ID.
        if (key === "_id") {
          const doc = await query.doc(value).get();
          return {
            success: true,
            documents: doc.exists ? [{ id: doc.id, data: doc.data() }] : [],
            lastVisible: null,
          };
        }

        // Apply search operator.
        switch (operator) {
          case "==":
            query = query.where(key, "==", value);
            break;
          case "<>":
            query = query.where(key, "!=", value);
            break;
          case "LIKE":
            // Firestore doesn't support native "contains" search.
            // We fetch all docs and filter them on the backend for this case.
            clientSideFilter = (docData) => {
              const fieldValue = docData[key];
              return (
                typeof fieldValue === "string" &&
                fieldValue.toLowerCase().includes(value.toLowerCase())
              );
            };
            break;
          default:
            query = query.where(key, "==", value);
            break;
        }
      }

      // Apply pagination if not a LIKE search.
      if (operator !== "LIKE" && lastVisible && lastVisible.id) {
        const startAfterDoc = await admin
          .firestore()
          .collection(collectionId)
          .doc(lastVisible.id)
          .get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      }

      // Limit results for performance, except for LIKE which requires full dataset for filtering.
      if (operator !== "LIKE") {
        query = query.limit(100);
      }

      const snapshot = await query.get();
      let documents = snapshot.docs.map((doc) => ({
        id: doc.id,
        data: doc.data(),
      }));

      // Apply client-side filter for LIKE search.
      if (clientSideFilter) {
        documents = documents.filter((doc) => clientSideFilter(doc.data));
      }

      // Handle pagination specifically for client-side filtered LIKE results.
      if (operator === "LIKE") {
        const page = lastVisible ? lastVisible.page || 0 : 0;
        const pageSize = 100;
        const start = page * pageSize;
        const end = start + pageSize;
        const paginatedDocs = documents.slice(start, end);

        const newLastVisible = end < documents.length ? { page: page + 1 } : null;
        return {
          success: true,
          documents: paginatedDocs,
          lastVisible: newLastVisible,
        };
      }

      const newLastVisible =
        snapshot.docs.length >= 100
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;

      return {
        success: true,
        documents,
        lastVisible: newLastVisible ? { id: newLastVisible.id } : null,
      };
    } catch (error) {
      console.error("Error in get-documents handler:", error);
      return { success: false, error: error.message };
    }
  }
);

/**
 * Handles adding a new document to a collection.
 */
ipcMain.handle("add-document", async (_, { collectionId, docId, data }) => {
  if (admin.apps.length === 0)
    return { success: false, error: "Firebase not initialized." };
  try {
    const collectionRef = admin.firestore().collection(collectionId);
    const docRef = docId ? collectionRef.doc(docId) : collectionRef.doc();
    await docRef.set(data);
    return { success: true, docId: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Handles updating an existing document.
 */
ipcMain.handle("update-document", async (_, { collectionId, docId, data }) => {
  if (admin.apps.length === 0)
    return { success: false, error: "Firebase not initialized." };
  try {
    await admin.firestore().collection(collectionId).doc(docId).set(data);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

/**
 * Handles deleting a document.
 */
ipcMain.handle("delete-document", async (_, { collectionId, docId }) => {
  if (admin.apps.length === 0)
    return { success: false, error: "Firebase not initialized." };
  try {
    await admin.firestore().collection(collectionId).doc(docId).delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});