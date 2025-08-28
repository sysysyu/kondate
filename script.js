document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const menuInput = document.getElementById('menu-input');
    const ingredientsInput = document.getElementById('ingredients-input');
    const tagsInput = document.getElementById('tags-input');
    const addButton = document.getElementById('add-button');
    const menuList = document.getElementById('menu-list');
    const generateButton = document.getElementById('generate-button');
    const weekPlan = document.getElementById('week-plan');
    const messageBox = document.getElementById('message-box');
    const filterTagsInput = document.getElementById('filter-tags-input');
    const shoppingListContainer = document.getElementById('shopping-list-container');
    const shoppingList = document.getElementById('shopping-list');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFile = document.getElementById('import-file');

    // データ構造: [{dishes: [], ingredients: [], tags: []}, ...]
    let menus = JSON.parse(localStorage.getItem('menus')) || [];
    let weeklyPlanData = []; // 生成された献立を保持
    let lastGeneratedMenus = []; // 前回生成された献立を保持

    // --- データ処理関数 ---
    const saveMenus = () => localStorage.setItem('menus', JSON.stringify(menus));

    // --- 描画関数 ---
    const renderMenuList = () => {
        menuList.innerHTML = '';
        if (menus.length === 0) {
            menuList.innerHTML = '<li class="text-slate-400">まだ献立が登録されていません。</li>';
            return;
        }
        menus.forEach((menu, index) => {
            const li = document.createElement('li');
            li.className = 'flex justify-between items-start bg-slate-50 p-4 rounded-lg fade-in';
            const menuItemsHtml = menu.dishes.map(dish => `<span>・${dish}</span>`).join('<br>');
            const tagsHtml = menu.tags.map(tag => `<span class="tag">${tag}</span>`).join(' ');
            li.innerHTML = `
                <div>
                    <div class="flex flex-col font-semibold text-slate-800">${menuItemsHtml}</div>
                    <div class="mt-2 flex flex-wrap gap-2">${tagsHtml}</div>
                </div>
                <button data-index="${index}" class="delete-button text-slate-400 hover:text-red-500 flex-shrink-0 ml-4 p-1 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg>
                </button>
            `;
            menuList.appendChild(li);
        });
    };

    const renderInitialWeekPlan = () => {
        const days = ['月', '火', '水', '木', '金', '土', '日'].map(d => `${d}曜日`);
        weekPlan.innerHTML = '';
        days.forEach(day => {
            const dayCard = document.createElement('div');
            dayCard.className = 'p-4 border border-slate-200 rounded-lg bg-slate-50';
            dayCard.innerHTML = `<h3 class="font-bold text-lg text-slate-600">${day}</h3><div class="text-slate-800 text-center text-xl mt-2 p-2 bg-white rounded-md shadow-sm min-h-[56px] flex items-center justify-center">-</div>`;
            weekPlan.appendChild(dayCard);
        });
    };

    const showMessage = (message, isError = true) => {
        messageBox.textContent = message;
        messageBox.className = `mt-5 text-center font-semibold ${isError ? 'text-red-500' : 'text-green-500'}`;
        setTimeout(() => { messageBox.textContent = ''; }, 4000);
    };

    // --- イベントリスナーとロジック ---
    const addMenu = () => {
        const dishes = menuInput.value.trim().split('\n').map(d => d.trim()).filter(Boolean);
        const ingredients = ingredientsInput.value.trim().split('\n').map(i => i.trim()).filter(Boolean);
        const tags = tagsInput.value.trim().split(',').map(t => t.trim()).filter(Boolean);

        if (dishes.length === 0) {
            showMessage('献立を最低1品は入力してください。');
            return;
        }

        const newMenuSortedString = JSON.stringify([...dishes].sort());
        if (menus.some(menu => JSON.stringify([...menu.dishes].sort()) === newMenuSortedString)) {
            showMessage('その献立セットは既に登録されています。');
            return;
        }

        menus.push({ dishes, ingredients, tags });
        saveMenus();
        renderMenuList();
        [menuInput, ingredientsInput, tagsInput].forEach(input => input.value = '');
        menuInput.focus();
    };

    menuList.addEventListener('click', (e) => {
        if (e.target.closest('.delete-button')) {
            const index = e.target.closest('.delete-button').dataset.index;
            menus.splice(index, 1);
            saveMenus();
            renderMenuList();
        }
    });

    generateButton.addEventListener('click', () => {
        const filterTags = filterTagsInput.value.trim().split(',').map(t => t.trim()).filter(Boolean);
        
        let filteredMenus = menus;
        if (filterTags.length > 0) {
            filteredMenus = menus.filter(menu => filterTags.every(filterTag => menu.tags.includes(filterTag)));
        }

        if (filteredMenus.length < 7) {
            showMessage(`日替わり献立には7種類以上の献立が必要です。(現在: ${filteredMenus.length}種類)`);
            return;
        }

        let candidatePool = filteredMenus.filter(menu => 
            !lastGeneratedMenus.some(lastMenu => 
                JSON.stringify(lastMenu.dishes.sort()) === JSON.stringify(menu.dishes.sort())
            )
        );

        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = filteredMenus;
            lastGeneratedMenus = [];
        }

        weekPlan.innerHTML = '';
        shoppingListContainer.classList.add('hidden');
        let newWeeklyPlan = [];
        let availableMenus = [...candidatePool];
        let mazegohanCount = 0;

        const isSpecialMenu = menu => menu && menu.dishes.some(d => d.includes('混ぜご飯') || d.includes('豚汁'));
        const isMazegohanMenu = menu => menu && menu.dishes.some(d => d.includes('混ぜご飯'));
        const getCategory = (menu) => {
            if (!menu || !menu.tags) return 'other';
            if (menu.tags.includes('和食') || menu.tags.includes('和風')) return 'japanese';
            if (menu.tags.includes('中華')) return 'chinese';
            if (menu.tags.includes('洋食') || menu.tags.includes('洋風')) return 'western';
            return 'other';
        };

        for (let i = 0; i < 7; i++) {
            const previousMenu = i > 0 ? newWeeklyPlan[i - 1] : null;
            const prevPrevMenu = i > 1 ? newWeeklyPlan[i - 2] : null;
            let pool = [...availableMenus];
            let selectedMenu;

            if (mazegohanCount >= 2) {
                const filteredPool = pool.filter(m => !isMazegohanMenu(m));
                if (filteredPool.length > 0) pool = filteredPool;
            }

            if (previousMenu && isSpecialMenu(previousMenu)) {
                const specialPool = pool.filter(isSpecialMenu);
                if (specialPool.length > 0) pool = specialPool;
            } 
            else if (previousMenu && prevPrevMenu) {
                const prevCategory = getCategory(previousMenu);
                const prevPrevCategory = getCategory(prevPrevMenu);
                if (prevCategory !== 'other' && prevCategory === prevPrevCategory) {
                    const differentCategoryPool = pool.filter(m => getCategory(m) !== prevCategory);
                    if (differentCategoryPool.length > 0) pool = differentCategoryPool;
                }
            }

            if (pool.length === 0) pool = [...availableMenus];
            
            selectedMenu = pool[Math.floor(Math.random() * pool.length)];
            newWeeklyPlan.push(selectedMenu);

            if (isMazegohanMenu(selectedMenu)) mazegohanCount++;
            
            const indexInAvailable = availableMenus.findIndex(m => JSON.stringify(m.dishes.sort()) === JSON.stringify(selectedMenu.dishes.sort()));
            if (indexInAvailable > -1) availableMenus.splice(indexInAvailable, 1);
        }
        
        weeklyPlanData = newWeeklyPlan;
        lastGeneratedMenus = [...weeklyPlanData];

        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        days.forEach((day, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'p-5 bg-white rounded-xl shadow-md border-l-4 border-indigo-500 fade-in';
            const menuItemsHtml = weeklyPlanData[index].dishes.map(dish => `<li class="text-slate-600">${dish}</li>`).join('');
            dayCard.innerHTML = `<h3 class="font-bold text-lg text-indigo-600">${day}</h3><ul class="list-disc list-inside mt-2 space-y-1">${menuItemsHtml}</ul>`;
            weekPlan.appendChild(dayCard);
        });
        
        generateShoppingList();
    });

    const generateShoppingList = () => {
        if (weeklyPlanData.length === 0) return;
        
        const allIngredients = weeklyPlanData.flatMap(menu => menu.ingredients);
        const uniqueIngredients = [...new Set(allIngredients)].sort();

        shoppingList.innerHTML = '';
        if (uniqueIngredients.length > 0) {
            uniqueIngredients.forEach((item, index) => {
                const id = `item-${index}`;
                const listItem = document.createElement('div');
                listItem.className = 'shopping-list-item';
                listItem.innerHTML = `
                    <input type="checkbox" id="${id}">
                    <label for="${id}">${item}</label>
                `;
                shoppingList.appendChild(listItem);
            });
            shoppingListContainer.classList.remove('hidden');
        } else {
            shoppingListContainer.classList.add('hidden');
        }
    };

    // データ管理機能
    exportButton.addEventListener('click', () => {
        if (menus.length === 0) {
            showMessage('エクスポートする献立がありません。');
            return;
        }
        const dataStr = JSON.stringify(menus, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-list.json';
        a.click();
        URL.revokeObjectURL(url);
        showMessage('献立リストをエクスポートしました。', false);
    });

    importButton.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (Array.isArray(importedData) && importedData.every(item => 'dishes' in item && 'ingredients' in item && 'tags' in item)) {
                    menus = importedData;
                    saveMenus();
                    renderMenuList();
                    showMessage('献立リストをインポートしました。', false);
                } else {
                    throw new Error('ファイルの形式が正しくありません。');
                }
            } catch (error) {
                showMessage(`インポートに失敗しました: ${error.message}`);
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    addButton.addEventListener('click', addMenu);

    // 初期表示
    renderMenuList();
    renderInitialWeekPlan();
});
