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
        // Shopping List
        shoppingListContainer: getElem('shopping-list-container'),
        shoppingList: getElem('shopping-list'),
        addIngredientInput: getElem('add-ingredient-input'),
        addIngredientButton: getElem('add-ingredient-button'),
        // Register Form
        addButton: getElem('add-button'),
        menuInput: getElem('menu-input'),
        ingredientsInput: getElem('ingredients-input'),
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
        editTagsContainer: getElem('edit-tags-container'),
        editMealTypeContainer: getElem('edit-meal-type-container'),
        editUrlInput: getElem('edit-url-input'),
        saveEditButton: getElem('save-edit-button'),
        cancelEditButton: getElem('cancel-edit-button'),
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
    let shoppingListState = {}; // { '卵': true, '鶏肉': false }
    let messageTimer = null; // メッセージ表示用のタイマーID

    // --- Utility Functions ---
    const showMessage = (msg, isError = true) => {
        clearTimeout(messageTimer); // 既存のタイマーをクリア
        elements.messageBox.textContent = msg;
        elements.messageBox.className = 'message-box';
        elements.messageBox.classList.add(isError ? 'error' : 'success', 'show');
        messageTimer = setTimeout(() => { // 新しいタイマーを設定
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
                if (typeof parsed === 'object' && parsed !== null) return parsed;
                return defaultValue;
            } catch (e) {
                console.error(`Error parsing data for key "${key}":`, e);
                return defaultValue;
            }
        }
        return defaultValue;
    };
    
    // Function to ensure all menus have necessary properties (ID, mealType)
    const sanitizeMenus = (menuArray) => {
        return menuArray.map((m, index) => ({
            ...m,
            id: m.id || Date.now() + index, // Assign a unique ID if missing
            mealType: m.mealType || 'normal' // Assign default mealType if missing
        }));
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
            
            let mealTypeBadge = '';
            if (menu.mealType === 'bento') {
                mealTypeBadge = `<span class="meal-type-badge bg-green-100 text-green-800">お弁当OK</span>`;
            } else if (menu.mealType === 'weekend') {
                mealTypeBadge = `<span class="meal-type-badge bg-purple-100 text-purple-800">週末向け</span>`;
            }

            card.innerHTML = `
                <div>
                    <div class="flex flex-wrap gap-2 mb-3">
                        ${menu.tags.map(tag => `<span class="tag-display">${tag}</span>`).join('')}
                        ${mealTypeBadge}
                    </div>
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
                    <div class="flex items-center gap-2">
                        <button data-id="${menu.id}" class="edit-button button-secondary text-sm">編集</button>
                        <button data-day-index="${index}" class="reroll-button icon-button text-slate-400 hover:text-indigo-600">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="flex flex-wrap gap-2 mb-3">${(menu.tags || []).map(tag => `<span class="tag-display">${tag}</span>`).join('')}</div>
                <ul class="list-disc list-inside text-slate-700">${(menu.dishes || []).map(dish => `<li>${dish}</li>`).join('')}</ul>
                ${menu.url ? `<a href="${menu.url}" target="_blank" class="recipe-link">レシピを見る</a>` : ''}`;
            elements.weekPlanContainer.appendChild(card);
        });
    };
    
    const renderShoppingList = () => {
        if (weeklyPlan.length === 0 && customShoppingItems.length === 0) {
            elements.shoppingListContainer.classList.add('hidden');
            return;
        }

        const generatedIngredients = weeklyPlan.flatMap(menu => menu.ingredients || []);
        const allIngredients = [...new Set([...generatedIngredients, ...customShoppingItems])].sort();
        
        if (allIngredients.length === 0) {
            elements.shoppingList.innerHTML = `<p class="text-slate-500 col-span-full">材料はありません。</p>`;
        } else {
            elements.shoppingList.innerHTML = allIngredients.map(item => {
                const isChecked = shoppingListState[item] || false;
                return `
                <label class="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input type="checkbox" data-item="${item}" ${isChecked ? 'checked' : ''} class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span>${item}</span>
                </label>`;
            }).join('');
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
        const mealType = elements.mealTypeContainer.querySelector('input[name="mealType"]:checked').value;

        if (dishes.length === 0 || tags.length === 0) {
            showMessage("献立とタグは必須です。");
            return;
        }

        menus.push({ id: Date.now(), dishes, ingredients, url, tags, mealType });
        saveData('menus', menus);
        renderMenuList();
        elements.menuInput.value = '';
        elements.ingredientsInput.value = '';
        elements.urlInput.value = '';
        elements.tagsContainer.querySelectorAll('.active').forEach(b => b.classList.remove('active'));
        elements.mealTypeContainer.querySelector('input[value="normal"]').checked = true;
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
        const allowMonthly = (generationStats.count - generationStats.lastMonthlyUsed) >= 4;
        let candidatePool = menus.filter(menu => !lastGeneratedMenus.some(last => last && last.id === menu.id));
        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = [...menus];
        }
        if (!allowMonthly) {
            candidatePool = candidatePool.filter(m => !m.tags.includes('月1'));
        }

        if (candidatePool.length < 7) {
            const reason = !allowMonthly ? `(今週は「月1」献立が除外されています)` : '';
            showMessage(`日替わり献立には7種類以上の献立が必要です。${reason} (現在: ${candidatePool.length}種類)`);
            return;
        }
        
        let newPlan = [];
        let available = [...candidatePool];
        const days = 7;

        const getPrimaryCategory = m => {
            if (!m || !m.tags) return 'other';
            const categories = ['和食', '中華', '洋食', '麺類', '定番'];
            return categories.find(cat => m.tags.includes(cat)) || 'other';
        };

        const generateDayMenu = (dayIndex, currentPlan, availableMenus) => {
            let pool = [...availableMenus];
            const prev = dayIndex > 0 ? currentPlan[dayIndex - 1] : null;

            // Apply day-of-week meal type rules
            if (dayIndex <= 3) pool = pool.filter(m => m.mealType !== 'weekend');
            if (dayIndex <= 2) {
                const bentoPool = pool.filter(m => m.mealType === 'bento');
                if (bentoPool.length > 0) pool = bentoPool;
            }

            // Apply weekly limit rules
            const mazegohanCount = currentPlan.filter(m => m && m.dishes.some(d => d.includes('混ぜご飯'))).length;
            const menruiCount = currentPlan.filter(m => m && m.tags.includes('麺類')).length;
            if (menruiCount >= 1) {
                const filtered = pool.filter(m => !m.tags.includes('麺類'));
                if (filtered.length > 0) pool = filtered;
            }
            if (mazegohanCount >= 2) {
                const filtered = pool.filter(m => !m.dishes.some(d => d.includes('混ぜご飯')));
                if (filtered.length > 0) pool = filtered;
            }

            // Apply category continuity rule
            const isSpecial = m => m && m.dishes.some(d => d.includes('混ぜご飯') || d.includes('豚汁'));
            let specialFollowUpChosen = false;
            
            if (prev && isSpecial(prev)) {
                const specialFollowUpPool = pool.filter(isSpecial);
                if (specialFollowUpPool.length > 0) {
                    pool = specialFollowUpPool;
                    specialFollowUpChosen = true;
                }
            }
            
            if (!specialFollowUpChosen && prev) {
                const prevCategory = getPrimaryCategory(prev);
                if (prevCategory !== 'other') {
                    const filtered = pool.filter(m => getPrimaryCategory(m) !== prevCategory);
                    if (filtered.length > 0) pool = filtered;
                }
            }

            if (pool.length === 0) pool = [...availableMenus];
            
            return pool[Math.floor(Math.random() * pool.length)];
        };

        for (let i = 0; i < days; i++) {
            const selected = generateDayMenu(i, newPlan, available);
            if (!selected) {
                 showMessage(`献立の候補が見つかりませんでした(${i + 1}日目)。ルールが厳しすぎる可能性があります。`);
                return;
            }
            newPlan.push(selected);
            available = available.filter(m => m.id !== selected.id);
        }

        generationStats.count++;
        if (newPlan.some(m => m.tags.includes('月1'))) {
            generationStats.lastMonthlyUsed = generationStats.count;
        }
        saveData('generationStats', generationStats);
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
    
    const handleAddIngredient = () => {
        const newItem = elements.addIngredientInput.value.trim();
        if (newItem) {
            if (!customShoppingItems.includes(newItem) && !weeklyPlan.flatMap(m => m.ingredients || []).includes(newItem)) {
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
            if (item) {
                shoppingListState[item] = checkbox.checked;
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

        const getPrimaryCategory = m => {
            if (!m || !m.tags) return 'other';
            const categories = ['和食', '中華', '洋食', '麺類', '定番'];
            return categories.find(cat => m.tags.includes(cat)) || 'other';
        };

        let pool = [...candidatePool];
        const prevMenu = dayIndex > 0 ? currentPlan[dayIndex - 1] : null;
        const nextMenu = dayIndex < 6 ? currentPlan[dayIndex + 1] : null;

        // Apply day-of-week meal type rules
        if (dayIndex <= 3) pool = pool.filter(m => m.mealType !== 'weekend');
        if (dayIndex <= 2) {
            const bentoPool = pool.filter(m => m.mealType === 'bento');
            if (bentoPool.length > 0) pool = bentoPool;
        }

        // Apply weekly limit rules
        const mazegohanCount = currentPlan.filter((m, i) => i !== dayIndex && m && m.dishes.some(d => d.includes('混ぜご飯'))).length;
        const menruiCount = currentPlan.filter((m, i) => i !== dayIndex && m && m.tags.includes('麺類')).length;
        if (menruiCount >= 1) pool = pool.filter(m => !m.tags.includes('麺類'));
        if (mazegohanCount >= 2) pool = pool.filter(m => !m.dishes.some(d => d.includes('混ぜご飯')));

        // Apply category continuity rule
        if (prevMenu) {
            const prevCategory = getPrimaryCategory(prevMenu);
            if (prevCategory !== 'other') {
                const filtered = pool.filter(m => getPrimaryCategory(m) !== prevCategory);
                if (filtered.length > 0) pool = filtered;
            }
        }
        if (nextMenu) {
            const nextCategory = getPrimaryCategory(nextMenu);
            if (nextCategory !== 'other') {
                const filtered = pool.filter(m => getPrimaryCategory(m) !== nextCategory);
                if (filtered.length > 0) pool = filtered;
            }
        }

        if (pool.length === 0) {
            showMessage("条件に合う代わりの献立が見つかりませんでした。");
            return;
        }
        
        const newMenu = pool[Math.floor(Math.random() * pool.length)];
        weeklyPlan[dayIndex] = newMenu;
        saveData('weeklyPlan', weeklyPlan);
        renderWeekPlan();
        renderShoppingList();
        showMessage(`${['月', '火', '水', '木', '金', '土', '日'][dayIndex]}曜日を決め直しました。`, false);
    };

    const handleWeekPlanClick = (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        if (button.classList.contains('edit-button')) {
            const id = Number(button.dataset.id);
            if (id) openEditModal(id);
        } else if (button.classList.contains('reroll-button')) {
            const dayIndex = Number(button.dataset.dayIndex);
            if (dayIndex >= 0) {
                handleRerollDay(dayIndex);
            }
        }
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
        const mealTypeInput = elements.editMealTypeContainer.querySelector(`input[value="${menu.mealType || 'normal'}"]`);
        if(mealTypeInput) mealTypeInput.checked = true;

        elements.editModal.classList.remove('hidden');
    };

    const closeEditModal = () => elements.editModal.classList.add('hidden');

    const handleSaveEdit = () => {
        const id = Number(elements.editIdInput.value);
        const menuIndex = menus.findIndex(m => m.id === id);
        if (menuIndex === -1) return;

        const dishes = elements.editMenuInput.value.split('\n').map(d => d.trim()).filter(Boolean);
        const tags = Array.from(elements.editTagsContainer.querySelectorAll('.active')).map(b => b.dataset.tag);
        const mealType = elements.editMealTypeContainer.querySelector('input[name="editMealType"]:checked').value;

        if (dishes.length === 0 || tags.length === 0) {
            showMessage("献立とタグは必須です。");
            return;
        }
        
        menus[menuIndex] = {
            id,
            dishes,
            ingredients: elements.editIngredientsInput.value.split('\n').map(i => i.trim()).filter(Boolean),
            url: elements.editUrlInput.value.trim(),
            tags,
            mealType,
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
        const dataToExport = { menus, weeklyPlan, lastGeneratedMenus, generationStats, customShoppingItems, shoppingListState };
        const data = JSON.stringify(dataToExport);
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
    elements.weekPlanContainer.addEventListener('click', handleWeekPlanClick);
    elements.settingsButton.addEventListener('click', () => elements.settingsModal.classList.remove('hidden'));
    elements.closeSettingsButton.addEventListener('click', () => elements.settingsModal.classList.add('hidden'));
    elements.saveEditButton.addEventListener('click', handleSaveEdit);
    elements.cancelEditButton.addEventListener('click', closeEditModal);
    elements.tagsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tag-select-button')) e.target.classList.toggle('active');
    });
    elements.editTagsContainer.addEventListener('click', e => {
        if (e.target.classList.contains('tag-select-button')) e.target.classList.toggle('active');
    });
    elements.exportButton.addEventListener('click', handleExport);
    elements.importFileInput.addEventListener('change', handleImport);
    elements.addIngredientButton.addEventListener('click', handleAddIngredient);
    elements.shoppingList.addEventListener('change', handleShoppingListCheck);


    // --- Initial Load ---
    const initializeApp = () => {
        menus = sanitizeMenus(loadData('menus', []));
        weeklyPlan = loadData('weeklyPlan', []);
        lastGeneratedMenus = loadData('lastGeneratedMenus', []);
        generationStats = loadData('generationStats', { count: 0, lastMonthlyUsed: -Infinity });
        customShoppingItems = loadData('customShoppingItems', []);
        shoppingListState = loadData('shoppingListState', {});

        renderMenuList();
        renderWeekPlan();
        renderShoppingList();
        
        elements.tabs.forEach((tab, index) => tab.classList.toggle('active', index === 0));
        elements.tabContents.forEach((content, index) => content.classList.toggle('active', index === 0));
    };

    initializeApp();
});

