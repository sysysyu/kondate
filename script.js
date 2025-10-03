document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Cache ---
    const getElem = (id) => document.getElementById(id);
    const querySelAll = (selector) => document.querySelectorAll(selector);

    const elements = {
        tabs: querySelAll('.tab-button'),
        tabContents: querySelAll('.tab-content'),
        settingsButton: getElem('settings-button'),
        generateButton: getElem('generate-button'),
        copyWeekPlanButton: getElem('copy-week-plan-button'),
        weekPlanContainer: getElem('week-plan'),
        messageBox: getElem('message-box'),
        // Shopping List
        shoppingListContainer: getElem('shopping-list-container'),
        shoppingList: getElem('shopping-list'),
        addIngredientInput: getElem('add-ingredient-input'),
        addIngredientButton: getElem('add-ingredient-button'),
        // Register Form
        addButton: getElem('add-button'),
        menuInput: getElem('menu-input'),
        ingredientsInput: getElem('ingredients-input'),
        memoInput: getElem('memo-input'),
        tagsContainer: getElem('tags-container'),
        mealTypeContainer: getElem('meal-type-container'),
        urlInput: getElem('url-input'),
        // List View
        searchInput: getElem('search-input'),
        menuListContainer: getElem('menu-list-container'),
        // Edit Modal
        editModal: getElem('edit-modal'),
        editIdInput: getElem('edit-id-input'),
        editMenuInput: getElem('edit-menu-input'),
        editIngredientsInput: getElem('edit-ingredients-input'),
        editMemoInput: getElem('edit-memo-input'),
        editTagsContainer: getElem('edit-tags-container'),
        editMealTypeContainer: getElem('edit-meal-type-container'),
        editUrlInput: getElem('edit-url-input'),
        saveEditButton: getElem('save-edit-button'),
        cancelEditButton: getElem('cancel-edit-button'),
        // Memo Modal
        memoModal: getElem('memo-modal'),
        memoContent: getElem('memo-content'),
        closeMemoButton: getElem('close-memo-button'),
        // Settings Modal
        settingsModal: getElem('settings-modal'),
        closeSettingsButton: getElem('close-settings-button'),
        exportButton: getElem('export-button'),
        importFileInput: getElem('import-file'),
    };

    // --- State ---
    let menus = [];
    let weeklyPlan = [];
    let lastGeneratedMenus = [];
    let generationStats = { count: 0, lastMonthlyUsed: -Infinity };
    let customShoppingItems = [];
    let shoppingListState = {};
    let messageTimer = null;

    // --- Utility Functions ---
    const showMessage = (msg, isError = true) => {
        clearTimeout(messageTimer);
        elements.messageBox.textContent = msg;
        
        elements.messageBox.classList.remove('bg-red-500', 'bg-green-500');
        
        elements.messageBox.classList.add(isError ? 'bg-red-500' : 'bg-green-500', 'show');
        
        messageTimer = setTimeout(() => {
            elements.messageBox.classList.remove('show');
        }, 3000);
    };

    // --- Data Persistence ---
    const saveData = (key, data) => localStorage.setItem(key, JSON.stringify(data));
    const loadData = (key, defaultValue = {}) => {
        const savedData = localStorage.getItem(key);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                return (typeof parsed === 'object' && parsed !== null) ? parsed : defaultValue;
            } catch (e) {
                console.error(`Error parsing data for key "${key}":`, e);
                return defaultValue;
            }
        }
        return defaultValue;
    };

    const sanitizeMenus = (menuArray) => {
        return menuArray.map((m, index) => ({
            ...m,
            id: m.id || Date.now() + index,
            mealType: m.mealType || 'normal',
            memo: m.memo || '',
        }));
    };

    // --- Rendering ---
    const renderMenuList = (searchTerm = '') => {
        elements.menuListContainer.innerHTML = '';
        const searchLower = searchTerm.toLowerCase();
        const filteredMenus = menus.filter(menu => {
            if (!menu || !menu.dishes || !menu.tags) return false;
            return menu.dishes.some(d => d.toLowerCase().includes(searchLower)) ||
                menu.tags.some(t => t.toLowerCase().includes(searchLower));
        });

        if (filteredMenus.length === 0) {
            elements.menuListContainer.innerHTML = `<p class="text-slate-500 text-center col-span-full">${searchTerm ? '検索結果がありません。' : '献立を登録してください。'}</p>`;
            return;
        }

        filteredMenus.forEach(menu => {
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-between';

            let mealTypeBadge = '';
            if (menu.mealType === 'bento') {
                mealTypeBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">お弁当OK</span>`;
            } else if (menu.mealType === 'weekend') {
                mealTypeBadge = `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">週末向け</span>`;
            }

            const links = [
                menu.url ? `<a href="${menu.url}" target="_blank" class="text-indigo-600 hover:underline font-semibold">レシピ</a>` : '',
                menu.memo ? `<a href="#" data-id="${menu.id}" class="memo-link text-indigo-600 hover:underline font-semibold">メモ</a>` : ''
            ].filter(Boolean).join('<span class="mx-2 text-slate-300">|</span>');

            card.innerHTML = `
                <div>
                    <div class="flex flex-wrap gap-2 mb-3 items-center">
                        ${menu.tags.map(tag => `<span class="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-semibold text-xs">${tag}</span>`).join('')}
                        ${mealTypeBadge}
                    </div>
                    <ul class="list-disc list-inside text-slate-700 mb-3 space-y-1">${menu.dishes.map(dish => `<li>${dish}</li>`).join('')}</ul>
                    <div class="text-sm mt-3 pt-3 border-t border-slate-100">${links}</div>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-id="${menu.id}" class="edit-button py-1 px-3 text-sm rounded-md bg-slate-100 hover:bg-slate-200 font-semibold transition">編集</button>
                    <button data-id="${menu.id}" class="delete-button py-1 px-3 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition">削除</button>
                </div>`;
            elements.menuListContainer.appendChild(card);
        });
    };

    const renderWeekPlan = () => {
        elements.weekPlanContainer.innerHTML = '';
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        if (weeklyPlan.length === 0) {
            elements.weekPlanContainer.innerHTML = `<p class="text-slate-500 text-center col-span-full py-8">「献立を決める」ボタンを押してください。</p>`;
            return;
        }
        weeklyPlan.forEach((menu, index) => {
            if (!menu) return;
            const card = document.createElement('div');
            card.className = 'bg-white p-4 rounded-lg shadow-sm border border-slate-200';
            const links = [
                menu.url ? `<a href="${menu.url}" target="_blank" class="text-indigo-600 hover:underline font-semibold">レシピ</a>` : '',
                menu.memo ? `<a href="#" data-id="${menu.id}" class="memo-link text-indigo-600 hover:underline font-semibold">メモ</a>` : ''
            ].filter(Boolean).join('<span class="mx-2 text-slate-300">|</span>');

            card.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-lg font-bold text-indigo-600">${days[index]}曜日</h3>
                    <div class="flex items-center gap-1">
                        <button data-id="${menu.id}" class="edit-button text-xs py-1 px-2 rounded-md bg-slate-100 hover:bg-slate-200 font-semibold transition">編集</button>
                        <button data-day-index="${index}" class="reroll-button text-slate-400 hover:text-indigo-600 w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-3">${(menu.tags || []).map(tag => `<span class="px-2 py-0.5 text-xs bg-slate-100 text-slate-700 rounded-full font-semibold">${tag}</span>`).join('')}</div>
                <ul class="list-disc list-inside text-slate-700 text-sm space-y-1">${(menu.dishes || []).map(dish => `<li>${dish}</li>`).join('')}</ul>
                <div class="text-sm mt-3 pt-3 border-t border-slate-100">${links}</div>`;
            elements.weekPlanContainer.appendChild(card);
        });
    };

    const renderShoppingList = () => {
        if (weeklyPlan.length === 0 && customShoppingItems.length === 0) {
            elements.shoppingListContainer.classList.add('hidden');
            return;
        }
        const generatedIngredients = weeklyPlan.flatMap(menu => menu ? (menu.ingredients || []) : []);
        const allIngredients = [...new Set([...generatedIngredients, ...customShoppingItems])].sort();

        elements.shoppingList.innerHTML = allIngredients.length === 0
            ? `<p class="text-slate-500 col-span-full">材料はありません。</p>`
            : allIngredients.map(item => {
                const isChecked = shoppingListState[item] || false;
                return `
                <label class="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input type="checkbox" data-item="${item}" ${isChecked ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span class="transition-colors ${isChecked ? 'line-through text-slate-400' : ''}">${item}</span>
                </label>`;
            }).join('');

        elements.shoppingListContainer.classList.remove('hidden');
    };

    // --- Event Handlers ---
    const handleTabClick = (e) => {
        const tab = e.target.closest('.tab-button');
        if (!tab) return;
        elements.tabs.forEach(t => {
            t.classList.remove('active');
        });
        tab.classList.add('active');
        elements.tabContents.forEach(c => c.classList.remove('active'));
        getElem(`tab-content-${tab.dataset.tab}`).classList.add('active');
    };

    const handleAddMenu = () => {
        const dishes = elements.menuInput.value.split('\n').map(d => d.trim()).filter(Boolean);
        const ingredients = elements.ingredientsInput.value.split('\n').map(i => i.trim()).filter(Boolean);
        const memo = elements.memoInput.value.trim();
        const url = elements.urlInput.value.trim();
        const tags = Array.from(elements.tagsContainer.querySelectorAll('.active')).map(b => b.dataset.tag);
        const mealType = elements.mealTypeContainer.querySelector('input[name="mealType"]:checked').value;

        if (dishes.length === 0 || tags.length === 0) {
            showMessage("献立とタグは必須です。");
            return;
        }

        menus.push({ id: Date.now(), dishes, ingredients, memo, url, tags, mealType });
        saveData('menus', menus);
        renderMenuList();
        elements.menuInput.value = '';
        elements.ingredientsInput.value = '';
        elements.memoInput.value = '';
        elements.urlInput.value = '';
        elements.tagsContainer.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
        elements.mealTypeContainer.querySelector('input[value="normal"]').checked = true;
        showMessage("献立を登録しました。", false);
    };

    const handleMenuListClick = (e) => {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        const id = Number(target.dataset.id);
        if(!id && !target.classList.contains('memo-link')) return;

        if (target.classList.contains('delete-button')) {
            menus = menus.filter(menu => menu.id !== id);
            saveData('menus', menus);
            renderMenuList(elements.searchInput.value);
            showMessage("献立を削除しました。", false);
        } else if (target.classList.contains('edit-button')) {
            openEditModal(id);
        } else if (target.classList.contains('memo-link')) {
            e.preventDefault();
            openMemoModal(id);
        }
    };
    
    const handleGeneratePlan = () => {
        if (menus.length < 7) {
            showMessage(`日替わり献立を作成するには、最低7種類の献立登録が必要です。(現在: ${menus.length}種類)`);
            return;
        }

        let candidatePool = menus.filter(menu => !lastGeneratedMenus.some(last => last && last.id === menu.id));
        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = [...menus];
        }
        
        let newPlan = [];
        let available = [...candidatePool];

        for (let i = 0; i < 7; i++) {
            if (available.length === 0) { // Safety check
                 showMessage(`献立の候補がなくなりました(${i + 1}日目)。ルールが厳しすぎる可能性があります。`);
                 return;
            }
            const randomIndex = Math.floor(Math.random() * available.length);
            const selected = available[randomIndex];
            newPlan.push(selected);
            available.splice(randomIndex, 1);
        }

        weeklyPlan = newPlan;
        lastGeneratedMenus = [...newPlan];
        shoppingListState = {};
        customShoppingItems = [];
        saveData('shoppingListState', shoppingListState);
        saveData('customShoppingItems', customShoppingItems);
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
    
    const handleAddIngredient = (e) => {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        const newItem = elements.addIngredientInput.value.trim();
        if (newItem) {
            const existingIngredients = weeklyPlan.flatMap(m => m ? m.ingredients || [] : []);
            if (!customShoppingItems.includes(newItem) && !existingIngredients.includes(newItem)) {
                customShoppingItems.push(newItem);
                saveData('customShoppingItems', customShoppingItems);
            }
            renderShoppingList();
            elements.addIngredientInput.value = '';
        }
    };
    
    const handleShoppingListCheck = (e) => {
        const checkbox = e.target;
        if (checkbox.type === 'checkbox') {
            const item = checkbox.dataset.item;
            const span = checkbox.nextElementSibling;
            if (item && span) {
                shoppingListState[item] = checkbox.checked;
                span.classList.toggle('line-through', checkbox.checked);
                span.classList.toggle('text-slate-400', checkbox.checked);
                saveData('shoppingListState', shoppingListState);
            }
        }
    };

    const handleRerollDay = (dayIndex) => {
        const currentPlan = [...weeklyPlan];
        const originalMenu = currentPlan[dayIndex];
        if (!originalMenu) return;

        let candidatePool = menus.filter(m => !currentPlan.some(planMenu => planMenu && planMenu.id === m.id));
        if (candidatePool.length === 0) {
            candidatePool = menus.filter(m => m.id !== originalMenu.id);
        }
        if (candidatePool.length === 0) {
            showMessage("代わりの献立がありません。");
            return;
        }
        
        const newMenu = candidatePool[Math.floor(Math.random() * candidatePool.length)];
        weeklyPlan[dayIndex] = newMenu;
        saveData('weeklyPlan', weeklyPlan);
        renderWeekPlan();
        renderShoppingList();
        showMessage(`${['月', '火', '水', '木', '金', '土', '日'][dayIndex]}曜日を決め直しました。`, false);
    };

    const handleWeekPlanClick = (e) => {
        const target = e.target.closest('button, a');
        if (!target) return;
        
        if (target.classList.contains('reroll-button')) {
            const dayIndex = Number(target.dataset.dayIndex);
            if (dayIndex >= 0) handleRerollDay(dayIndex);
            return;
        }
        
        const id = Number(target.dataset.id);
        if(!id) return;
        
        if (target.classList.contains('edit-button')) {
            openEditModal(id);
        } else if (target.classList.contains('memo-link')) {
            e.preventDefault();
            openMemoModal(id);
        }
    };

    // --- Modal Logic ---
    const openModal = (modalElem) => modalElem.classList.remove('hidden');
    const closeModal = (modalElem) => modalElem.classList.add('hidden');

    const openEditModal = (id) => {
        const menu = menus.find(m => m.id === id);
        if (!menu) return;
        elements.editIdInput.value = id;
        elements.editMenuInput.value = menu.dishes.join('\n');
        elements.editIngredientsInput.value = (menu.ingredients || []).join('\n');
        elements.editMemoInput.value = menu.memo || '';
        elements.editUrlInput.value = menu.url || '';
        elements.editTagsContainer.querySelectorAll('.tag-select-button').forEach(btn => {
            const isActive = menu.tags.includes(btn.dataset.tag);
            btn.classList.toggle('active', isActive);
        });
        const mealTypeInput = elements.editMealTypeContainer.querySelector(`input[value="${menu.mealType || 'normal'}"]`);
        if(mealTypeInput) mealTypeInput.checked = true;
        
        const modalContent = elements.editModal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
        openModal(elements.editModal);
    };
    
    const openMemoModal = (id) => {
        const menu = menus.find(m => m.id === id);
        if (menu) {
            elements.memoContent.textContent = menu.memo || 'メモはありません。';
            
            elements.memoContent.scrollTop = 0;
            openModal(elements.memoModal);
        }
    };
    
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
            memo: elements.editMemoInput.value.trim(),
            url: elements.editUrlInput.value.trim(),
            tags,
            mealType: elements.editMealTypeContainer.querySelector('input[name="editMealType"]:checked').value,
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
        closeModal(elements.editModal);
        showMessage("献立を更新しました。", false);
    };

    const handleExport = () => {
        if (menus.length === 0) {
            showMessage("エクスポートするデータがありません。");
            return;
        }
        const dataToExport = { menus, weeklyPlan, lastGeneratedMenus, generationStats, customShoppingItems, shoppingListState };
        const data = JSON.stringify(dataToExport, null, 2); // Prettify JSON
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `menu_app_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                    menus = sanitizeMenus(data.menus);
                    weeklyPlan = data.weeklyPlan || [];
                    lastGeneratedMenus = data.lastGeneratedMenus || [];
                    generationStats = data.generationStats || { count: 0, lastMonthlyUsed: -Infinity };
                    customShoppingItems = data.customShoppingItems || [];
                    shoppingListState = data.shoppingListState || {};

                    saveData('menus', menus);
                    saveData('weeklyPlan', weeklyPlan);
                    saveData('lastGeneratedMenus', lastGeneratedMenus);
                    saveData('generationStats', generationStats);
                    saveData('customShoppingItems', customShoppingItems);
                    saveData('shoppingListState', shoppingListState);

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
                closeModal(elements.settingsModal);
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
    elements.weekPlanContainer.addEventListener('click', handleWeekPlanClick);
    
    // Modal listeners
    elements.settingsButton.addEventListener('click', () => openModal(elements.settingsModal));
    elements.closeSettingsButton.addEventListener('click', () => closeModal(elements.settingsModal));
    elements.saveEditButton.addEventListener('click', handleSaveEdit);
    elements.cancelEditButton.addEventListener('click', () => closeModal(elements.editModal));
    elements.closeMemoButton.addEventListener('click', () => closeModal(elements.memoModal));
    
    // Close modals on overlay click
    [elements.editModal, elements.memoModal, elements.settingsModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal);
        });
    });

    const handleTagClick = (e) => {
        if (e.target.classList.contains('tag-select-button')) {
            e.target.classList.toggle('active');
        }
    };
    elements.tagsContainer.addEventListener('click', handleTagClick);
    elements.editTagsContainer.addEventListener('click', handleTagClick);

    elements.exportButton.addEventListener('click', handleExport);
    elements.importFileInput.addEventListener('change', handleImport);
    
    elements.addIngredientButton.addEventListener('click', handleAddIngredient);
    elements.addIngredientInput.addEventListener('keydown', handleAddIngredient);
    elements.shoppingList.addEventListener('change', handleShoppingListCheck);

    // --- Initial Load ---
    const initializeApp = () => {
        menus = sanitizeMenus(loadData('menus', []));
        weeklyPlan = loadData('weeklyPlan', []);
        lastGeneratedMenus = loadData('lastGeneratedMenus', []);
        generationStats = loadData('generationStats', { count: 0, lastMonthlyUsed: -Infinity });
        customShoppingItems = loadData('customShoppingItems', []);
        shoppingListState = loadData('shoppingListState', {});

        // Apply initial styles to tabs
        elements.tabs.forEach((tab, index) => {
            const isActive = index === 0;
            tab.classList.toggle('active', isActive);
        });
        elements.tabContents.forEach((content, index) => content.classList.toggle('active', index === 0));

        renderMenuList();
        renderWeekPlan();
        renderShoppingList();
    };

    initializeApp();
});

