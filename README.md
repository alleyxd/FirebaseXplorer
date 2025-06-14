# FirestoreXplorer

![FirestoreXplorer Logo](./assets/imgs/logo.png)

A simple and powerful desktop application for exploring, managing, and interacting with your Firestore data effortlessly. Built with Electron.

---

## Key Features

* **Connect Securely:** Load your Firebase projects by simply selecting your service account JSON file.
* **Project History:** Quickly switch between your recently used projects without needing to find the service account file every time.
* **Tabbed Navigation:** Open multiple collections in separate tabs for easy multitasking and comparison.
* **Multiple Data Views:**
    * **Table View:** A clean, spreadsheet-like view of your documents.
    * **Tree View:** An expandable, hierarchical view to explore nested objects and arrays.
    * **JSON View:** View the raw JSON data for your entire collection.
* **Full CRUD Operations:** Easily **Create**, **Read**, **Update**, and **Delete** documents through an intuitive modal interface.
* **Document Editing:** Edit documents with a dual-editor that provides both a spreadsheet-style field editor and a raw JSON editor, with changes synced between them in real-time.
* **Simple Search:** Find exactly what you're looking for with a simple search capabilities, including **`LIKE`** (case-insensitive contains), **`==`** (exact match), and **`<>`** (not equal to) operators.
* **Pagination:** Effortlessly browse through large collections with simple next/previous page controls.

---

## Screenshots

**Main Dashboard**
*View all your collections in the sidebar and open them in easily manageable tabs.*
![Main application view showing collections and tabs](./assets/screenshot1.png)

**Advanced Document Editor**
*Edit documents using a spreadsheet-style field editor or the raw JSON view, with two-way data binding.*
![Modal showing the document editor](./assets/screenshot2.png)

**Powerful Search & Filtering**
*Filter your data with multiple operators to quickly find the documents you need.*
![Search bar with operators and results](./assets/screenshot3.png)

---

## Installation & Usage

To run FirestoreXplorer on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alleyxd/firestorexplorer.git
    cd firestorexplorer
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the application:**
    ```bash
    npm start
    ```

---

## Building for Production

You can build a distributable package for your operating system (e.g., `.exe` for Windows, `.dmg` for macOS, `.AppImage` for Linux).

**Before building, ensure you have the necessary icons in the `assets` folder:**

* `assets/icon.ico` for Windows
* `assets/icon.icns` for macOS
* `assets/icon.png` (512x512) for Linux

**Run the build command:**
```bash
npm run dist
```

The packaged application will be located in the newly created `dist` folder.

## Technology Stack
* [Electron](https://www.electronjs.org) for the core desktop application framework.
* [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup) for backend communication with Firestore.
* [Tailwind CSS](https://tailwindcss.com) for styling the user interface.

## License
This project is licensed under the ISC License.