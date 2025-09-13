document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Cache ---
    const getElem = (id) => document.getElementById(id);
    const querySel = (selector) => document.querySelector(selector);
    const querySelAll = (selector) => document.querySelectorAll(selector);

    const elements = {
        tabs: querySelAll('.tab-button'),
        tabContents: querySelAll('.tab-content'),
        settingsButton: getElem('settings-button'),
        generateButton: getElem('generate-button'),
        copyWeekPlanButton: getElem('copy-week-plan-button'),
        weekPlanContainer: getElem('week-plan'),
        messageBox: getElem('message-box'),
        shoppingListContainer: getElem('shopping-list-container'),
        shoppingList: getElem('shopping-list'),
        // Register Form
        addButton: getElem('add-button'),
        menuInput: getElem('menu-input'),
        ingredientsInput: getElem('ingredients-input'),
        tagsContainer: getElem('tags-container'),
        urlInput: getElem('url-input'),
        // List View
        searchInput: getElem('search-input'),
        menuListContainer: getElem('menu-list-container'),
        // Edit Modal
        editModal: getElem('edit-modal'),
        editIdInput: getElem('edit-id-input'),
        editMenuInput: getElem('edit-menu-input'),
        editIngredientsInput: getElem('edit-ingredients-input'),
        editTagsContainer: getElem('edit-tags-container'),
        editUrlInput: getElem('edit-url-input'),
        saveEditButton: getElem('save-edit-button'),
        cancelEditButton: getElem('cancel-edit-button'),
        // Settings Modal
        settingsModal: getElem('settings-modal'),
        closeSettingsButton: getElem('close-settings-button'),
        exportButton: getElem('export-button'),
        importFileLabel: querySel('label[for="import-file"]'),
        importFileInput: getElem('import-file'),
    };

    // --- State ---
    let menus = [];
    let weeklyPlan = [];
    let lastGeneratedMenus = [];

    // --- Utility Functions ---
    const showMessage = (msg, isError = true) => {
        elements.messageBox.textContent = msg;
        elements.messageBox.className = 'message-box';
        elements.messageBox.classList.add(isError ? 'error' : 'success', 'show');
        setTimeout(() => elements.messageBox.classList.remove('show'), 3000);
    };

    // --- Data Persistence ---
    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const loadData = (key, defaultValue = []) => {
        const savedData = localStorage.getItem(key);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                return Array.isArray(parsed) ? parsed : defaultValue;
            } catch (e) {
                console.error(`Error parsing data for key "${key}":`, e);
                return defaultValue;
            }
        }
        return defaultValue;
    };

    // --- Rendering ---
    const renderMenuList = (searchTerm = '') => {
        elements.menuListContainer.innerHTML = '';
        const filteredMenus = menus.filter(menu => {
            if (!menu || !menu.dishes || !menu.tags) return false;
            const searchLower = searchTerm.toLowerCase();
            return menu.dishes.some(d => d.toLowerCase().includes(searchLower)) ||
                   menu.tags.some(t => t.toLowerCase().includes(searchLower));
        });

        if (filteredMenus.length === 0) {
            elements.menuListContainer.innerHTML = `<p class="text-slate-500 text-center">${searchTerm ? '検索結果がありません。' : '献立を登録してください。'}</p>`;
            return;
        }

        filteredMenus.forEach(menu => {
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md border border-slate-200 flex flex-col justify-between';
            card.innerHTML = `
                <div>
                    <div class="flex flex-wrap gap-2 mb-3">${menu.tags.map(tag => `<span class="tag-display">${tag}</span>`).join('')}</div>
                    <ul class="list-disc list-inside text-slate-700 mb-3">${menu.dishes.map(dish => `<li>${dish}</li>`).join('')}</ul>
                    ${menu.url ? `<a href="${menu.url}" target="_blank" class="recipe-link">レシピを見る</a>` : ''}
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-id="${menu.id}" class="edit-button button-secondary">編集</button>
                    <button data-id="${menu.id}" class="delete-button button-danger">削除</button>
                </div>`;
            elements.menuListContainer.appendChild(card);
        });
    };
    
    const renderWeekPlan = () => {
        elements.weekPlanContainer.innerHTML = '';
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        if (weeklyPlan.length === 0) {
            elements.weekPlanContainer.innerHTML = `<p class="text-slate-500 text-center col-span-full">「献立を決める」ボタンを押してください。</p>`;
            return;
        }
        weeklyPlan.forEach((menu, index) => {
            if (!menu) return;
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md border border-slate-200';
            card.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-xl font-bold text-indigo-700">${days[index]}曜日</h3>
                    <button data-id="${menu.id}" class="edit-button button-secondary text-sm">編集</button>
                </div>
                <div class="flex flex-wrap gap-2 mb-3">${(menu.tags || []).map(tag => `<span class="tag-display">${tag}</span>`).join('')}</div>
                <ul class="list-disc list-inside text-slate-700">${(menu.dishes || []).map(dish => `<li>${dish}</li>`).join('')}</ul>
                ${menu.url ? `<a href="${menu.url}" target="_blank" class="recipe-link">レシピを見る</a>` : ''}`;
            elements.weekPlanContainer.appendChild(card);
        });
    };
    
    const renderShoppingList = () => {
        if (weeklyPlan.length === 0) {
            elements.shoppingListContainer.classList.add('hidden');
            return;
        }
        const allIngredients = weeklyPlan.flatMap(menu => menu.ingredients || []);
        const uniqueIngredients = [...new Set(allIngredients)].sort();
        
        if (uniqueIngredients.length === 0) {
            elements.shoppingList.innerHTML = `<p class="text-slate-500 col-span-full">登録された材料はありません。</p>`;
        } else {
            elements.shoppingList.innerHTML = uniqueIngredients.map(item => `
                <label class="flex items-center space-x-2 text-slate-600">
                    <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span>${item}</span>
                </label>`).join('');
        }
        elements.shoppingListContainer.classList.remove('hidden');
    };

    // --- Event Handlers ---
    const handleTabClick = (e) => {
        const tab = e.target.closest('.tab-button');
        if (!tab) return;
        elements.tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        elements.tabContents.forEach(c => c.classList.remove('active'));
        getElem(`tab-content-${tab.dataset.tab}`).classList.add('active');
    };

    const handleAddMenu = () => {
        const dishes = elements.menuInput.value.split('\n').map(d => d.trim()).filter(Boolean);
        const ingredients = elements.ingredientsInput.value.split('\n').map(i => i.trim()).filter(Boolean);
        const url = elements.urlInput.value.trim();
        const tags = Array.from(elements.tagsContainer.querySelectorAll('.active')).map(b => b.dataset.tag);

        if (dishes.length === 0 || tags.length === 0) {
            showMessage("献立とタグは必須です。");
            return;
        }

        menus.push({ id: Date.now(), dishes, ingredients, url, tags });
        saveData('menus', menus);
        renderMenuList();
        elements.menuInput.value = '';
        elements.ingredientsInput.value = '';
        elements.urlInput.value = '';
        elements.tagsContainer.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
        showMessage("献立を登録しました。", false);
    };

    const handleMenuListClick = (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const id = Number(button.dataset.id);
        if (!id) return;

        if (button.classList.contains('delete-button')) {
            menus = menus.filter(menu => menu.id !== id);
            saveData('menus', menus);
            renderMenuList(elements.searchInput.value);
            showMessage("献立を削除しました。", false);
        } else if (button.classList.contains('edit-button')) {
            openEditModal(id);
        }
    };

    const handleGeneratePlan = () => {
        if (menus.length < 7) {
            showMessage(`日替わり献立には7種類以上の献立が必要です。(現在: ${menus.length}種類)`);
            return;
        }

        let candidatePool = menus.filter(menu => !lastGeneratedMenus.some(last => last && last.id === menu.id));
        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = [...menus];
        }

        let newPlan = [];
        let available = [...candidatePool];
        let mazegohanCount = 0;
        const days = 7;

        const isSpecial = m => m && m.dishes && m.dishes.some(d => d.includes('混ぜご飯') || d.includes('豚汁'));
        const isMazegohan = m => m && m.dishes && m.dishes.some(d => d.includes('混ぜご飯'));
        const getCat = m => {
            if (!m || !m.tags) return 'other';
            if (m.tags.includes('和食')) return 'japanese';
            if (m.tags.includes('中華')) return 'chinese';
            if (m.tags.includes('洋食')) return 'western';
            return 'other';
        };

        for (let i = 0; i < days; i++) {
            if (available.length === 0) {
                showMessage("献立の候補がなくなりました。同じ献立が使われる可能性があります。", true);
                available = [...menus]; // Safeguard: Refill from the master list
            }
            
            let pool = [...available];
            const prev = i > 0 ? newPlan[i - 1] : null;
            const prev2 = i > 1 ? newPlan[i - 2] : null;

            // --- Apply filters progressively ---
            // Each filter is only applied if it doesn't result in an empty list.

            // Rule 1: "混ぜご飯" or "豚汁" must be followed by a similar dish if possible.
            if (prev && isSpecial(prev)) {
                const specialPool = pool.filter(isSpecial);
                if (specialPool.length > 0) pool = specialPool;
            }

            // Rule 2: Limit "混ぜご飯" to 2 times a week.
            if (mazegohanCount >= 2) {
                const nonMazegohanPool = pool.filter(m => !isMazegohan(m));
                if (nonMazegohanPool.length > 0) pool = nonMazegohanPool;
            }
            
            // Rule 3: Avoid 3 consecutive days of the same category.
            if (prev && prev2 && getCat(prev) !== 'other' && getCat(prev) === getCat(prev2)) {
                const balancedPool = pool.filter(m => getCat(m) !== getCat(prev));
                if (balancedPool.length > 0) pool = balancedPool;
            }
            
            // --- Select a menu ---
            if (pool.length === 0) { // Ultimate fallback
                 pool = [...available];
            }
            
            const selected = pool[Math.floor(Math.random() * pool.length)];

            if (!selected) {
                showMessage("予期せぬエラーで献立作成に失敗しました。");
                return; // Exit the function to prevent further errors.
            }

            newPlan.push(selected);
            if (isMazegohan(selected)) mazegohanCount++;
            
            available = available.filter(m => m.id !== selected.id);
        }

        weeklyPlan = newPlan;
        lastGeneratedMenus = [...newPlan];
        saveData('weeklyPlan', weeklyPlan);
        saveData('lastGeneratedMenus', lastGeneratedMenus);
        renderWeekPlan();
        renderShoppingList();
    };
    
    const handleCopyPlan = () => {
        if (weeklyPlan.length === 0) {
            showMessage("献立が作成されていません。");
            return;
        }
        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        const text = weeklyPlan.map((menu, i) => {
            if(!menu) return `${days[i]}\n - 献立データなし`;
            const dishes = (menu.dishes || []).map(d => `・${d}`).join('\n');
            const url = menu.url ? `URL：${menu.url}` : '';
            return `${days[i]}\n${dishes}\n${url}`.trim();
        }).join('\n\n');

        navigator.clipboard.writeText(text)
            .then(() => showMessage("今週の献立をコピーしました。", false))
            .catch(() => showMessage("コピーに失敗しました。"));
    };

    // --- Modal Logic ---
    const openEditModal = (id) => {
        const menu = menus.find(m => m.id === id);
        if (!menu) return;
        elements.editIdInput.value = id;
        elements.editMenuInput.value = menu.dishes.join('\n');
        elements.editIngredientsInput.value = (menu.ingredients || []).join('\n');
        elements.editUrlInput.value = menu.url || '';
        elements.editTagsContainer.querySelectorAll('.tag-select-button').forEach(btn => {
            btn.classList.toggle('active', menu.tags.includes(btn.dataset.tag));
        });
        elements.editModal.classList.remove('hidden');
    };

    const closeEditModal = () => elements.editModal.classList.add('hidden');

    const handleSaveEdit = () => {
        const id = Number(elements.editIdInput.value);
        const menuIndex = menus.findIndex(m => m.id === id);
        if (menuIndex === -1) return;

        const dishes = elements.editMenuInput.value.split('\n').map(d => d.trim()).filter(Boolean);
        const tags = Array.from(elements.editTagsContainer.querySelectorAll('.active')).map(b => b.dataset.tag);

        if (dishes.length === 0 || tags.length === 0) {
            showMessage("献立とタグは必須です。");
            return;
        }
        
        menus[menuIndex] = {
            id,
            dishes,
            ingredients: elements.editIngredientsInput.value.split('\n').map(i => i.trim()).filter(Boolean),
            url: elements.editUrlInput.value.trim(),
            tags
        };
        
        saveData('menus', menus);
        const planIndex = weeklyPlan.findIndex(m => m && m.id === id);
        if (planIndex !== -1) {
            weeklyPlan[planIndex] = menus[menuIndex];
            saveData('weeklyPlan', weeklyPlan);
        }

        renderMenuList(elements.searchInput.value);
        renderWeekPlan();
        renderShoppingList();
        closeEditModal();
        showMessage("献立を更新しました。", false);
    };

    const handleExport = () => {
        const data = JSON.stringify({ menus, weeklyPlan, lastGeneratedMenus });
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `menu_app_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data && Array.isArray(data.menus)) {
                    menus = data.menus;
                    weeklyPlan = data.weeklyPlan || [];
                    lastGeneratedMenus = data.lastGeneratedMenus || [];
                    saveData('menus', menus);
                    saveData('weeklyPlan', weeklyPlan);
                    saveData('lastGeneratedMenus', lastGeneratedMenus);
                    renderMenuList();
                    renderWeekPlan();
                    renderShoppingList();
                    showMessage("データをインポートしました。", false);
                } else {
                    showMessage("無効なファイル形式です。");
                }
            } catch (err) {
                showMessage("ファイルの読み込みに失敗しました。");
            } finally {
                elements.settingsModal.classList.add('hidden');
                elements.importFileInput.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- Event Listeners Setup ---
    document.querySelector('nav').addEventListener('click', handleTabClick);
    elements.addButton.addEventListener('click', handleAddMenu);
    elements.menuListContainer.addEventListener('click', handleMenuListClick);
    elements.searchInput.addEventListener('input', () => renderMenuList(elements.searchInput.value));
    elements.generateButton.addEventListener('click', handleGeneratePlan);
    elements.copyWeekPlanButton.addEventListener('click', handleCopyPlan);
    elements.weekPlanContainer.addEventListener('click', handleMenuListClick);
    
    // Modals
    elements.settingsButton.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
    elements.closeSettingsButton.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
    elements.saveEditButton.addEventListener('click', handleSaveEdit);
    elements.cancelEditButton.addEventListener('click', closeEditModal);

    // Tag Selection
    elements.tagsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tag-select-button')) e.target.classList.toggle('active');
    });
    elements.editTagsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tag-select-button')) e.target.classList.toggle('active');
    });
    
    // Data Management
    elements.exportButton.addEventListener('click', handleExport);
    elements.importFileInput.addEventListener('change', handleImport);

    // --- Initial Load ---
    const initializeApp = () => {
        menus = loadData('menus');
        weeklyPlan = loadData('weeklyPlan');
        lastGeneratedMenus = loadData('lastGeneratedMenus');
        renderMenuList();
        renderWeekPlan();
        renderShoppingList();
        
        elements.tabs.forEach((tab, index) => tab.classList.toggle('active', index === 0));
        elements.tabContents.forEach((content, index) => content.classList.toggle('active', index === 0));
    };

    initializeApp();
});

