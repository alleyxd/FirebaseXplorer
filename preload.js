/**
 * Preload Script for FirestoreXplorer
 *
 * This script runs in a privileged environment before the renderer process (the UI).
 * It acts as a secure bridge, exposing only specific, safe functions from the
 * main process (backend) to the renderer process.
 */
const { contextBridge, ipcRenderer } = require("electron");

// Use the contextBridge to securely expose functions to the renderer process.
contextBridge.exposeInMainWorld("electronAPI", {
  // Opens a file dialog to select a new service account file.
  loadServiceAccountFile: () => ipcRenderer.invoke("load-service-account-file"),

  // Loads a project using a saved file path from the "recents" list.
  loadServiceAccountPath: (filePath) =>
    ipcRenderer.invoke("load-service-account-path", filePath),

  // Fetches the list of collections for the current project.
  getCollections: () => ipcRenderer.invoke("get-collections"),

  // Fetches a paginated/searched list of documents from a collection.
  getDocuments: (args) => ipcRenderer.invoke("get-documents", args),

  // Adds a new document to a collection.
  addDocument: (args) => ipcRenderer.invoke("add-document", args),

  // Updates an existing document.
  updateDocument: (args) => ipcRenderer.invoke("update-document", args),

  // Deletes a document from a collection.
  deleteDocument: (args) => ipcRenderer.invoke("delete-document", args),
});