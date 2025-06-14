/**
 * Handles all DOM manipulation and user interactions in the renderer process.
 * This script is the "frontend" of the Electron application.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- Element References ---
    // A good practice to grab all your DOM elements at the top.
    const loadProjectBtn = document.getElementById('load-project-btn');
    const recentProjectsBtn = document.getElementById('recent-projects-btn');
    const recentProjectsDropdown = document.getElementById('recent-projects-dropdown');
    const projectInfo = document.getElementById('project-info');
    const collectionsList = document.getElementById('collections-list');
    const tabsContainer = document.getElementById('tabs-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const contentArea = document.getElementById('content-area');
    const collectionTitle = document.getElementById('collection-title');
    const addDocBtn = document.getElementById('add-doc-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const toggleSearchBtn = document.getElementById('toggle-search-btn');
    const searchContainer = document.getElementById('search-container');
    const searchKeySelect = document.getElementById('search-key-select');
    const searchOperatorSelect = document.getElementById('search-operator-select');
    const searchValueInput = document.getElementById('search-value-input');
    const searchBtn = document.getElementById('search-btn');
    const clearSearchBtn = document.getElementById('clear-search-btn');
    const viewTabsContainer = document.getElementById('view-tabs');
    const viewsContainer = document.getElementById('views-container');
    const paginationControls = document.getElementById('pagination-controls');
    const prevPageBtn = document.getElementById('prev-page-btn');
    const nextPageBtn = document.getElementById('next-page-btn');
    const pageInfo = document.getElementById('page-info');
    
    // Modal elements
    const modal = document.getElementById('doc-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const docIdInput = document.getElementById('doc-id-input');
    const keyValueEditor = document.getElementById('key-value-editor');
    const addFieldBtn = document.getElementById('add-field-btn');
    const docDataTextarea = document.getElementById('doc-data-textarea');
    const jsonError = document.getElementById('json-error');
    const saveDocBtn = document.getElementById('save-doc-btn');
    const deleteDocBtnModal = document.getElementById('delete-doc-btn-modal');

    // --- State Management ---
    // These variables hold the application's current state.
    let openTabs = [];
    let activeTabId = null;
    let currentEditingDocId = null;
    let isUpdatingFromJson = false;
    let isUpdatingFromInputs = false;
    let recentProjects = JSON.parse(localStorage.getItem('recentProjects') || '[]');

    // --- FUNCTION DEFINITIONS ---

    /**
     * Resets the main UI to its initial state when loading a new project.
     */
    function resetUIForNewProject() {
        openTabs = [];
        activeTabId = null;
        collectionsList.innerHTML = '';
        tabsContainer.innerHTML = '';
        contentArea.classList.add('hidden');
        welcomeMessage.classList.remove('hidden');
    }
    
    /**
     * Fetches and displays the list of collections for the current project.
     */
    async function loadCollections() {
        const result = await window.electronAPI.getCollections();
        collectionsList.innerHTML = '';
        if (result.success && result.collections) {
            result.collections.forEach(id => {
                const li = document.createElement('li');
                li.textContent = id;
                li.className = 'sidebar-item p-2 rounded-md cursor-pointer font-medium truncate';
                li.onclick = () => openOrSwitchToTab(id);
                collectionsList.appendChild(li);
            });
        }
    }

    /**
     * Initializes the UI after a new project has been successfully loaded.
     * @param {string} projectId The ID of the loaded Firebase project.
     */
    async function initializeProjectUI(projectId) {
        projectInfo.innerHTML = `<p class="text-sm font-medium text-orange-400">${projectId}</p>`;
        resetUIForNewProject();
        await loadCollections();
    }

    /**
     * Displays an error message if a project fails to load.
     * @param {string} error The error message.
     * @param {string|null} filePathToRemove The path of the failed project to remove from recents.
     */
    function handleLoadError(error, filePathToRemove = null) {
        projectInfo.innerHTML = `<p class="text-sm text-red-400">Failed to load</p>`;
        alert(`Error: ${error}`);
        if(filePathToRemove) {
            removeRecentProject(filePathToRemove);
        }
    }

    /**
     * Handles the user selecting a new project file from the file dialog.
     */
    async function loadProjectFromFile() {
        const result = await window.electronAPI.loadServiceAccountFile();
        if (result && result.success) {
            addRecentProject(result.projectId, result.filePath);
            await initializeProjectUI(result.projectId);
        } else if (result && result.error) {
            handleLoadError(result.error);
        }
    }

    /**
     * Loads a project from a file path stored in the "recents" list.
     * @param {string} projectId The project ID.
     * @param {string} filePath The local path to the service account file.
     */
    async function loadProjectFromPath(projectId, filePath) {
        const result = await window.electronAPI.loadServiceAccountPath(filePath);
        if (result && result.success) {
            await initializeProjectUI(result.projectId);
        } else if (result && result.error) {
            handleLoadError(result.error, filePath);
        }
    }
    
    /**
     * Adds a project to the recent projects list in local storage.
     * @param {string} projectId The project ID.
     * @param {string} filePath The local path to the service account file.
     */
    function addRecentProject(projectId, filePath) {
        recentProjects = recentProjects.filter(p => p.filePath !== filePath);
        recentProjects.unshift({ projectId, filePath });
        if (recentProjects.length > 5) recentProjects.pop();
        localStorage.setItem('recentProjects', JSON.stringify(recentProjects));
        updateRecentProjectsDropdown();
    }

    /**
     * Removes a project from the recent projects list.
     * @param {string} filePath The path of the project to remove.
     */
    function removeRecentProject(filePath) {
        recentProjects = recentProjects.filter(p => p.filePath !== filePath);
        localStorage.setItem('recentProjects', JSON.stringify(recentProjects));
        updateRecentProjectsDropdown();
    }

    /**
     * Renders the recent projects dropdown menu from local storage data.
     */
    function updateRecentProjectsDropdown() {
        recentProjectsDropdown.innerHTML = '';
        if (recentProjects.length === 0) {
            recentProjectsDropdown.innerHTML = `<div class="p-2 text-xs text-zinc-400">No recent projects.</div>`;
            return;
        }

        recentProjects.forEach(p => {
            const item = document.createElement('div');
            item.className = 'flex justify-between items-center p-2 hover:bg-zinc-600 cursor-pointer';
            item.onclick = () => {
                loadProjectFromPath(p.projectId, p.filePath);
                recentProjectsDropdown.classList.add('hidden');
            };
            item.innerHTML = `<span class="text-sm truncate">${p.projectId}</span>`;
            
            const removeBtn = document.createElement('button');
            removeBtn.innerHTML = '<i class="ph ph-x text-xs"></i>';
            removeBtn.className = 'p-1 rounded-full hover:bg-red-500';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeRecentProject(p.filePath);
            };
            item.appendChild(removeBtn);
            recentProjectsDropdown.appendChild(item);
        });
        
        const clearBtn = document.createElement('div');
        clearBtn.className = 'p-2 mt-1 border-t border-zinc-600 text-center text-xs text-red-400 hover:bg-red-500 hover:text-white cursor-pointer';
        clearBtn.textContent = 'Clear All';
        clearBtn.onclick = () => {
            recentProjects = [];
            localStorage.setItem('recentProjects', '[]');
            updateRecentProjectsDropdown();
        };
        recentProjectsDropdown.appendChild(clearBtn);
    }
    
    /**
     * Opens a new tab for a collection or switches to it if already open.
     * @param {string} collectionId The ID of the collection to open.
     */
    async function openOrSwitchToTab(collectionId) {
        if (!openTabs.find(t => t.id === collectionId)) {
            openTabs.push({ id: collectionId, documents: [], view: 'table', page: 1, lastVisible: null, history: [], searchQuery: null, allKeys: new Set(['_id']) });
            await loadDocumentsForTab(collectionId);
        }
        setActiveTab(collectionId);
    }
    
    /**
     * Fetches documents for a specific tab, handling pagination and search.
     * @param {string} collectionId The ID of the collection.
     * @param {'next'|'prev'|null} pageDirection The direction to paginate.
     */
    async function loadDocumentsForTab(collectionId, pageDirection = null) {
        const tab = openTabs.find(t => t.id === collectionId);
        if (!tab) return;

        let lastVisible = null;
        const isLikeSearch = tab.searchQuery && tab.searchQuery.operator === 'LIKE';

        if(pageDirection === 'next') {
            lastVisible = tab.lastVisible;
        } else if (pageDirection === 'prev' && tab.page > 1) {
             if (isLikeSearch) {
                lastVisible = { page: tab.page - 2 };
            } else {
                lastVisible = tab.history[tab.page - 2] || null;
            }
        } else {
            tab.page = 1;
            tab.history = [];
        }

        const result = await window.electronAPI.getDocuments({ collectionId, lastVisible, searchQuery: tab.searchQuery });
        
        if (result.success) {
            tab.documents = result.documents;
            tab.lastVisible = result.lastVisible;
            if(pageDirection === 'next') {
                if (isLikeSearch) {
                   tab.page++;
                } else {
                   tab.history.push(lastVisible);
                   tab.page++;
                }
            } else if (pageDirection === 'prev' && tab.page > 1) {
                if (isLikeSearch) {
                    tab.page--;
                } else {
                    tab.history.pop();
                    tab.page--;
                }
            }
            tab.documents.forEach(doc => Object.keys(doc.data).forEach(key => tab.allKeys.add(key)));
        } else {
            alert(`Error fetching documents for ${collectionId}: ${result.error}`);
        }
    }
    
    /**
     * Refreshes the data in the currently active tab.
     */
    function refreshActiveTabData() {
        if (!activeTabId) return;
        const tab = openTabs.find(t => t.id === activeTabId);
        if (tab) {
            tab.page = 1;
            tab.history = [];
            tab.searchQuery = null;
            searchValueInput.value = '';
            loadDocumentsForTab(activeTabId).then(() => renderContentForActiveTab());
        }
    }

    /**
     * Navigates to the next or previous page of documents.
     * @param {'next'|'prev'} direction The direction to paginate.
     */
    async function changePage(direction) {
        if (!activeTabId) return;
        await loadDocumentsForTab(activeTabId, direction);
        renderContentForActiveTab();
    }

    /**
     * Executes a search based on the current search bar values.
     */
    async function executeSearch() {
        const tab = openTabs.find(t => t.id === activeTabId);
        if(!tab) return;
        
        tab.searchQuery = {
            key: searchKeySelect.value,
            operator: searchOperatorSelect.value,
            value: searchValueInput.value,
        };
        await loadDocumentsForTab(tab.id);
        renderContentForActiveTab();
    }

    /**
     * Clears the current search and reloads the collection.
     */
    async function clearSearch() {
        const tab = openTabs.find(t => t.id === activeTabId);
        if(!tab) return;
        
        tab.searchQuery = null;
        searchValueInput.value = '';
        await loadDocumentsForTab(tab.id);
        renderContentForActiveTab();
    }

    // --- Main UI Rendering Functions ---

    /**
     * Renders the collection tabs at the top of the main panel.
     */
    function renderTabs() {
        tabsContainer.innerHTML = '';
        openTabs.forEach(tab => {
            const tabEl = document.createElement('div');
            tabEl.className = `tab p-3 pr-10 whitespace-nowrap relative cursor-pointer flex-shrink-0 ${tab.id === activeTabId ? 'active' : ''}`;
            tabEl.dataset.collectionId = tab.id;
            const tabName = document.createElement('span');
            tabName.textContent = tab.id;
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<i class="ph ph-x"></i>';
            closeBtn.className = 'absolute top-1/2 right-2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-600 opacity-50 hover:opacity-100';
            closeBtn.dataset.closeId = tab.id;
            tabEl.append(tabName, closeBtn);
            tabsContainer.appendChild(tabEl);
        });
    }

    /**
     * Sets the specified collection tab as the active one.
     * @param {string} collectionId The ID of the collection tab to activate.
     */
    function setActiveTab(collectionId) {
        activeTabId = collectionId;
        renderTabs();
        renderContentForActiveTab();
        document.querySelectorAll('#collections-list li').forEach(li => li.classList.toggle('active', li.textContent === collectionId));
    }

    /**
     * Renders the entire content area for the currently active tab.
     */
    function renderContentForActiveTab() {
        const tab = openTabs.find(t => t.id === activeTabId);
        if (!tab) {
            contentArea.classList.add('hidden');
            welcomeMessage.classList.remove('hidden');
            return;
        }
        welcomeMessage.classList.add('hidden');
        contentArea.classList.remove('hidden');
        collectionTitle.textContent = tab.id;
        document.querySelectorAll('.view-tab').forEach(vt => vt.classList.toggle('active', vt.dataset.view === tab.view));
        
        const currentSearchKey = searchKeySelect.value;
        searchKeySelect.innerHTML = '';
        Array.from(tab.allKeys).sort().forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = key;
            searchKeySelect.appendChild(option);
        });

        if(currentSearchKey && tab.allKeys.has(currentSearchKey)) {
             searchKeySelect.value = currentSearchKey;
        } else if (tab.allKeys.size > 1) {
            searchKeySelect.selectedIndex = 1;
        }

        if(tab.searchQuery) {
             searchKeySelect.value = tab.searchQuery.key;
             searchOperatorSelect.value = tab.searchQuery.operator;
             searchValueInput.value = tab.searchQuery.value;
        }

        renderView(tab);
        updatePagination(tab);
    }
    
    /**
     * Renders the data view (Table, Tree, or JSON) for the active tab.
     * @param {object} tab The active tab object from the `openTabs` array.
     */
    function renderView(tab) {
        viewsContainer.innerHTML = '';
        const documents = tab.documents;
        if (documents.length === 0) {
            viewsContainer.innerHTML = `<div class="text-zinc-400 p-4">No documents found matching your query.</div>`;
            return;
        }
        switch (tab.view) {
            case 'table': renderTableView(documents); break;
            case 'tree': renderTreeView(documents); break;
            case 'json': renderJsonView(documents); break;
        }
    }

    /**
     * Updates the state and appearance of the pagination controls.
     * @param {object} tab The active tab object.
     */
    function updatePagination(tab) {
        pageInfo.textContent = `Page ${tab.page}`;
        prevPageBtn.disabled = tab.page <= 1;
        nextPageBtn.disabled = !tab.lastVisible;
        prevPageBtn.classList.toggle('opacity-50', prevPageBtn.disabled);
        nextPageBtn.classList.toggle('opacity-50', nextPageBtn.disabled);
    }
    
    /**
     * Renders the main data table view.
     * @param {Array} documents The array of documents to display.
     */
    function renderTableView(documents) {
        const tableWrapper = document.createElement('div');
        tableWrapper.className = "w-full h-full overflow-auto";
        const headers = ['_id', ...Array.from(new Set(documents.flatMap(d => Object.keys(d.data))))];
        const table = document.createElement('table');
        table.className = 'w-full text-sm text-left';
        const tbody = document.createElement('tbody');

        documents.forEach(doc => {
            const row = tbody.insertRow();
            row.className = "border-b border-zinc-700 table-row cursor-pointer";
            row.dataset.docId = doc.id;

            headers.forEach(header => {
                const cell = row.insertCell();
                cell.className = "p-2 align-top max-w-xs truncate";
                const value = header === '_id' ? doc.id : doc.data[header];
                const displayValue = (typeof value === 'object' && value !== null) 
                    ? JSON.stringify(value) 
                    : (value === undefined || value === null) ? '' : String(value);
                
                cell.textContent = displayValue;
                cell.title = displayValue;
            });
        });
        
        table.innerHTML = `<thead class="table-header"><tr>${headers.map(h => `<th class="p-2 font-semibold">${h}</th>`).join('')}</tr></thead>`;
        table.appendChild(tbody);
        tableWrapper.appendChild(table);
        viewsContainer.appendChild(tableWrapper);

        table.querySelectorAll('tbody tr').forEach(row => {
            row.addEventListener('dblclick', () => {
                const docId = row.dataset.docId;
                const doc = documents.find(d => d.id === docId);
                if (doc) openModalForEdit(doc);
            });
        });
    }
    
    /**
     * Renders the expandable tree view.
     * @param {Array} documents The array of documents to display.
     */
     function renderTreeView(documents) {
        viewsContainer.innerHTML = '';
        documents.forEach(doc => {
            const docContainer = document.createElement('div');
            docContainer.className = 'bg-zinc-800 p-3 rounded-lg mb-2';
            
            const idEl = document.createElement('h3');
            idEl.className = 'font-bold text-orange-400 text-lg';
            idEl.textContent = doc.id;
            
            const contentEl = createTreeHtml(doc.data, "Document");
            contentEl.classList.add('expanded');
            
            docContainer.append(idEl, contentEl);
            viewsContainer.appendChild(docContainer);
        });
    }

    /**
     * Recursively builds the HTML for the tree view.
     * @param {object} obj The object or value to render.
     * @param {string} keyName The name of the key for this node.
     * @returns {HTMLElement} The generated DOM element for the node.
     */
    function createTreeHtml(obj, keyName) {
        const isObject = typeof obj === 'object' && obj !== null;
        
        const nodeEl = document.createElement('div');
        nodeEl.className = isObject ? 'tree-node' : 'tree-leaf';
        nodeEl.style.paddingLeft = '1.5rem';

        const headerEl = document.createElement('div');
        headerEl.className = 'node-header flex items-center cursor-pointer select-none';
        
        const keyEl = document.createElement('span');
        keyEl.className = 'font-semibold text-zinc-300';
        
        if (isObject) {
            const icon = document.createElement('i');
            icon.className = 'ph ph-caret-right caret-icon mr-1';
            headerEl.appendChild(icon);
            keyEl.textContent = `${keyName}: ${Array.isArray(obj) ? `[${obj.length} items]` : '{...}'}`;
        } else {
            keyEl.innerHTML = `<span class="font-semibold text-zinc-300">${keyName}: </span><span class="text-amber-500">${JSON.stringify(obj)}</span>`;
        }

        headerEl.appendChild(keyEl);
        nodeEl.appendChild(headerEl);

        if (isObject) {
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'node-content';
            
            for (const key in obj) {
                contentWrapper.appendChild(createTreeHtml(obj[key], key));
            }
            nodeEl.appendChild(contentWrapper);
            
            headerEl.onclick = (e) => {
                e.stopPropagation();
                nodeEl.classList.toggle('expanded');
            };
        }
        
        return nodeEl;
    }

    /**
     * Renders the raw JSON view.
     * @param {Array} documents The array of documents to display.
     */
    function renderJsonView(documents) {
        viewsContainer.innerHTML = `<div class="bg-zinc-800 p-4 rounded-lg overflow-auto h-full"><pre><code class="language-json h-full">${JSON.stringify(documents, null, 2)}</code></pre></div>`;
    }

    // --- Modal Logic ---

    /**
     * Renders the key-value input fields inside the modal.
     * @param {object} data The document data to display.
     * @param {boolean} addNew If true, adds a blank new row.
     */
    function renderKeyValueInputs(data, addNew = false) {
        if (!addNew) {
            keyValueEditor.innerHTML = '';
        }
        const dataToShow = data || {};

        for (const key in dataToShow) {
            createKeyValueRow(key, dataToShow[key]);
        }
        if (addNew) {
            createKeyValueRow('', '', true);
        }
    }

    /**
     * Creates a single row in the key-value editor table.
     * @param {string} key The field key.
     * @param {*} value The field value.
     * @param {boolean} shouldFocus If true, focuses the new row's key input.
     */
    function createKeyValueRow(key, value, shouldFocus = false) {
        const row = document.createElement('tr');
        row.className = "border-b border-zinc-700";
        
        const keyCell = document.createElement('td');
        keyCell.className = "p-1 border-r border-zinc-600";
        const keyInput = document.createElement('input');
        keyInput.type = 'text';
        keyInput.value = key;
        keyInput.placeholder = 'key';
        keyInput.className = 'kv-input p-1 w-full font-mono text-sm rounded-md';
        keyCell.appendChild(keyInput);

        const valueCell = document.createElement('td');
        valueCell.className = "p-1 border-r border-zinc-600";
        const valueInput = document.createElement('textarea');
        const isObject = typeof value === 'object' && value !== null;
        valueInput.value = isObject ? JSON.stringify(value, null, 2) : value;
        valueInput.placeholder = 'value';
        valueInput.className = 'kv-input p-1 w-full resize-y min-h-[28px] font-mono text-sm rounded-md align-bottom';
        const autoResize = (el) => {
            el.style.height = 'auto';
            el.style.height = '20px';
        };
        valueInput.addEventListener('input', () => autoResize(valueInput));
        valueCell.appendChild(valueInput);
        
        const removeCell = document.createElement('td');
        removeCell.className = "p-1 text-center align-middle";
        const removeBtn = document.createElement('button');
        removeBtn.innerHTML = '<i class="ph ph-trash text-base text-red-400 hover:text-red-500"></i>';
        removeBtn.className = "p-1 rounded-full hover:bg-zinc-700";
        removeBtn.onclick = () => {
            row.remove();
            updateJsonFromInputs();
        };
        removeCell.appendChild(removeBtn);

        row.append(keyCell, valueCell, removeCell);
        keyValueEditor.appendChild(row);

        setTimeout(() => autoResize(valueInput), 0);

        if (shouldFocus) {
            keyInput.focus();
        }
    }
    
    /**
     * Updates the raw JSON textarea based on the key-value inputs.
     */
    function updateJsonFromInputs() {
        if (isUpdatingFromJson) return;
        isUpdatingFromInputs = true;
        const data = {};
        const rows = keyValueEditor.querySelectorAll('tr');
        
        rows.forEach(row => {
            const keyInput = row.querySelector('input[type="text"]');
            const valueInput = row.querySelector('textarea');
            const key = keyInput.value.trim();
            const valueStr = valueInput.value;

            if (key) {
                try {
                    data[key] = JSON.parse(valueStr);
                } catch(e) {
                    data[key] = valueStr;
                }
            }
        });
        docDataTextarea.value = JSON.stringify(data, null, 2);
        isUpdatingFromInputs = false;
    }

    /**
     * Updates the key-value inputs based on the raw JSON textarea.
     */
    function updateInputsFromJson() {
        if (isUpdatingFromInputs) return;
        isUpdatingFromJson = true;

        try {
            const newData = JSON.parse(docDataTextarea.value);
            jsonError.textContent = '';
            
            const currentRows = new Map();
            keyValueEditor.querySelectorAll('tr').forEach(row => {
                const keyInput = row.querySelector('input[type="text"]');
                currentRows.set(keyInput.value, row);
            });

            const newKeys = new Set(Object.keys(newData));

            for(const key of newKeys){
                const value = newData[key];
                if(currentRows.has(key)){
                    const row = currentRows.get(key);
                    const valueInput = row.querySelector('textarea');
                    const isObject = typeof value === 'object' && value !== null;
                    const newValueStr = isObject ? JSON.stringify(value, null, 2) : String(value);
                    if(valueInput.value !== newValueStr) {
                         valueInput.value = newValueStr;
                         const autoResize = (el) => {
                            el.style.height = 'auto';
                            el.style.height = (el.scrollHeight) + 'px';
                         };
                         autoResize(valueInput);
                    }
                    currentRows.delete(key);
                } else {
                    createKeyValueRow(key, value);
                }
            }

            currentRows.forEach((row, key) => {
                row.remove();
            });

        } catch (e) {
            jsonError.textContent = 'Invalid JSON format.';
        }

        isUpdatingFromJson = false;
    }

    /**
     * Handles clicks within the tab bar (switching or closing tabs).
     */
    function handleTabClick(event) {
        const tabEl = event.target.closest('.tab');
        const closeBtn = event.target.closest('button');
        if (closeBtn && tabEl) {
            event.stopPropagation();
            closeTab(closeBtn.dataset.closeId);
        } else if (tabEl) {
            setActiveTab(tabEl.dataset.collectionId);
        }
    }
    
    /**
     * Closes a collection tab.
     * @param {string} collectionId The ID of the collection tab to close.
     */
    function closeTab(collectionId) {
        openTabs = openTabs.filter(t => t.id !== collectionId);
        activeTabId = (activeTabId === collectionId) ? (openTabs.length > 0 ? openTabs[openTabs.length - 1].id : null) : activeTabId;
        if (activeTabId) {
            setActiveTab(activeTabId);
        } else {
            contentArea.classList.add('hidden');
            welcomeMessage.classList.remove('hidden');
            renderTabs();
            document.querySelectorAll('#collections-list li.active').forEach(li => li.classList.remove('active'));
        }
    }
    
    /**
     * Handles switching between Table, Tree, and JSON views.
     */
    function handleViewSwitch(event) {
        const view = event.target.dataset.view;
        const tab = openTabs.find(t => t.id === activeTabId);
        if (view && tab) {
            tab.view = view;
            renderContentForActiveTab();
        }
    }
    
    /**
     * Opens the modal to add a new document.
     */
    function openModalForAdd() {
        if (!activeTabId) return;
        currentEditingDocId = null;
        modalTitle.textContent = `Add Document to "${activeTabId}"`;
        docIdInput.value = '';
        docIdInput.disabled = false;
        const initialData = { key: "value" };
        docDataTextarea.value = JSON.stringify(initialData, null, 2);
        renderKeyValueInputs(initialData);
        deleteDocBtnModal.classList.add('hidden');
        jsonError.textContent = '';
        modal.style.display = 'flex';
    }

    /**
     * Opens the modal to edit an existing document.
     * @param {object} doc The document object to edit.
     */
    function openModalForEdit(doc) {
        currentEditingDocId = doc.id;
        modalTitle.textContent = `Edit Document: ${doc.id}`;
        docIdInput.value = doc.id;
        docIdInput.disabled = true;
        docDataTextarea.value = JSON.stringify(doc.data, null, 2);
        renderKeyValueInputs(doc.data);
        deleteDocBtnModal.classList.remove('hidden');
        jsonError.textContent = '';
        modal.style.display = 'flex';
    }

    /**
     * Closes the Add/Edit modal.
     */
    function closeModal() {
        modal.style.display = 'none';
        keyValueEditor.innerHTML = '';
    }

    /**
     * Saves a new or updated document to Firestore.
     */
    async function handleSaveDocument() {
        let data;
        try {
            data = JSON.parse(docDataTextarea.value);
            jsonError.textContent = '';
        } catch (e) {
            jsonError.textContent = 'Invalid JSON format.';
            return;
        }

        const result = currentEditingDocId
            ? await window.electronAPI.updateDocument({ collectionId: activeTabId, docId: currentEditingDocId, data })
            : await window.electronAPI.addDocument({ collectionId: activeTabId, docId: docIdInput.value || null, data });

        if (result.success) {
            closeModal();
            refreshActiveTabData();
        } else {
            alert(`Error saving document: ${result.error}`);
        }
    }
    
    /**
     * Deletes a document from Firestore after confirmation.
     */
    async function handleDeleteDocument() {
        if (!currentEditingDocId || !confirm(`Are you sure you want to delete document "${currentEditingDocId}"?`)) return;
        
        const result = await window.electronAPI.deleteDocument({ collectionId: activeTabId, docId: currentEditingDocId });
        if (result.success) {
            closeModal();
            refreshActiveTabData();
        } else {
            alert(`Error deleting document: ${result.error}`);
        }
    }
    
    // --- INITIALIZATION ---
    /**
     * Binds all event listeners to their respective DOM elements.
     */
    function init() {
        updateRecentProjectsDropdown();
        loadProjectBtn.addEventListener('click', loadProjectFromFile);
        recentProjectsBtn.addEventListener('click', () => recentProjectsDropdown.classList.toggle('hidden'));
        document.addEventListener('click', (e) => {
            if (!recentProjectsBtn.contains(e.target) && !recentProjectsDropdown.contains(e.target)) {
                recentProjectsDropdown.classList.add('hidden');
            }
        });
        tabsContainer.addEventListener('click', handleTabClick);
        addDocBtn.addEventListener('click', () => openModalForAdd());
        refreshBtn.addEventListener('click', refreshActiveTabData);
        searchBtn.addEventListener('click', executeSearch);
        clearSearchBtn.addEventListener('click', clearSearch);
        nextPageBtn.addEventListener('click', () => changePage('next'));
        prevPageBtn.addEventListener('click', () => changePage('prev'));
        viewTabsContainer.addEventListener('click', handleViewSwitch);
        closeModalBtn.addEventListener('click', closeModal);
        saveDocBtn.addEventListener('click', handleSaveDocument);
        deleteDocBtnModal.addEventListener('click', handleDeleteDocument);
        addFieldBtn.addEventListener('click', () => renderKeyValueInputs(null, true));
        keyValueEditor.addEventListener('input', updateJsonFromInputs);
        docDataTextarea.addEventListener('input', updateInputsFromJson);
        toggleSearchBtn.addEventListener('click', () => {
            searchContainer.classList.toggle('expanded');
        });
    }
    
    init();
});