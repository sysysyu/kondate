document.addEventListener('DOMContentLoaded', () => {
    // DOM要素の取得
    const menuInput = document.getElementById('menu-input');
    const ingredientsInput = document.getElementById('ingredients-input');
    const tagsInput = document.getElementById('tags-input');
    const urlInput = document.getElementById('url-input');
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
    
    // Edit Modal Elements
    const editModal = document.getElementById('edit-modal');
    const editIndexInput = document.getElementById('edit-index');
    const editMenuInput = document.getElementById('edit-menu-input');
    const editIngredientsInput = document.getElementById('edit-ingredients-input');
    const editTagsInput = document.getElementById('edit-tags-input');
    const editUrlInput = document.getElementById('edit-url-input');
    const saveEditButton = document.getElementById('save-edit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');


    // データ構造: [{dishes: [], ingredients: [], tags: [], url: ""}, ...]
    let menus = JSON.parse(localStorage.getItem('menus')) || [];
    let weeklyPlanData = [];
    let lastGeneratedMenus = [];
    let availableSwaps = []; // 入れ替え可能な献立プール

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
            const urlHtml = menu.url ? `<a href="${menu.url}" target="_blank" rel="noopener noreferrer" class="recipe-link mt-2 block"><i class="fas fa-link mr-1"></i>レシピを見る</a>` : '';
            
            li.innerHTML = `
                <div>
                    <div class="flex flex-col font-semibold text-slate-800">${menuItemsHtml}</div>
                    <div class="mt-2 flex flex-wrap gap-2">${tagsHtml}</div>
                    ${urlHtml}
                </div>
                <div class="flex flex-col items-center gap-2 flex-shrink-0 ml-2">
                    <button data-index="${index}" class="edit-button icon-button" title="編集">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button data-index="${index}" class="delete-button icon-button delete" title="削除">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            menuList.appendChild(li);
        });
    };
    
    const renderWeekPlan = () => {
        weekPlan.innerHTML = '';
        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        days.forEach((day, index) => {
            const dayCard = document.createElement('div');
            dayCard.className = 'p-5 bg-white rounded-xl shadow-md border-l-4 border-indigo-500 fade-in';
            const menu = weeklyPlanData[index];
            const menuItemsHtml = menu.dishes.map(dish => `<li class="text-slate-600">${dish}</li>`).join('');
            const urlHtml = menu.url ? `<a href="${menu.url}" target="_blank" rel="noopener noreferrer" class="recipe-link mt-2 block"><i class="fas fa-link mr-1"></i>レシピ</a>` : '';
            const swapButtonHtml = `<button data-index="${index}" class="swap-button icon-button ml-auto" title="入れ替え"><i class="fas fa-sync-alt"></i></button>`;

            dayCard.innerHTML = `
                <div class="flex justify-between items-center">
                    <h3 class="font-bold text-lg text-indigo-600">${day}</h3>
                    ${swapButtonHtml}
                </div>
                <ul class="list-disc list-inside mt-2 space-y-1">${menuItemsHtml}</ul>
                ${urlHtml}
            `;
            weekPlan.appendChild(dayCard);
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
        const url = urlInput.value.trim();

        if (dishes.length === 0) {
            showMessage('献立を最低1品は入力してください。');
            return;
        }

        const newMenuSortedString = JSON.stringify([...dishes].sort());
        if (menus.some(menu => JSON.stringify([...menu.dishes].sort()) === newMenuSortedString)) {
            showMessage('その献立セットは既に登録されています。');
            return;
        }

        menus.push({ dishes, ingredients, tags, url });
        saveMenus();
        renderMenuList();
        [menuInput, ingredientsInput, tagsInput, urlInput].forEach(input => input.value = '');
        menuInput.focus();
    };

    menuList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const index = button.dataset.index;
        if (button.classList.contains('delete-button')) {
            menus.splice(index, 1);
            saveMenus();
            renderMenuList();
        } else if (button.classList.contains('edit-button')) {
            openEditModal(index);
        }
    });

    // --- 週間献立生成 ---
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
        availableSwaps = availableMenus; // 残りを入れ替えプールに

        renderWeekPlan();
        generateShoppingList();
    });
    
    // --- 献立入れ替え ---
    weekPlan.addEventListener('click', (e) => {
        const swapButton = e.target.closest('.swap-button');
        if (!swapButton) return;
        
        if (availableSwaps.length === 0) {
            showMessage("入れ替えられる献立がありません。");
            return;
        }

        const dayIndex = parseInt(swapButton.dataset.index, 10);
        const oldMenu = weeklyPlanData[dayIndex];
        
        const swapIndex = Math.floor(Math.random() * availableSwaps.length);
        const newMenu = availableSwaps[swapIndex];
        
        weeklyPlanData[dayIndex] = newMenu;
        
        availableSwaps.splice(swapIndex, 1);
        availableSwaps.push(oldMenu);
        
        renderWeekPlan();
        generateShoppingList();
    });

    // --- お買い物リスト ---
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
                listItem.innerHTML = `<input type="checkbox" id="${id}"><label for="${id}">${item}</label>`;
                shoppingList.appendChild(listItem);
            });
            shoppingListContainer.classList.remove('hidden');
        } else {
            shoppingListContainer.classList.add('hidden');
        }
    };
    
    // --- 編集モーダル関連 ---
    const openEditModal = (index) => {
        const menu = menus[index];
        editIndexInput.value = index;
        editMenuInput.value = menu.dishes.join('\n');
        editIngredientsInput.value = menu.ingredients.join('\n');
        editTagsInput.value = menu.tags.join(', ');
        editUrlInput.value = menu.url || '';
        editModal.classList.remove('hidden');
    };

    const closeEditModal = () => editModal.classList.add('hidden');

    const saveEditedMenu = () => {
        const index = parseInt(editIndexInput.value, 10);
        const dishes = editMenuInput.value.trim().split('\n').map(d => d.trim()).filter(Boolean);
        if (dishes.length === 0) {
            alert('献立は最低1品入力してください。');
            return;
        }
        
        menus[index] = {
            dishes,
            ingredients: editIngredientsInput.value.trim().split('\n').map(i => i.trim()).filter(Boolean),
            tags: editTagsInput.value.trim().split(',').map(t => t.trim()).filter(Boolean),
            url: editUrlInput.value.trim()
        };
        
        saveMenus();
        renderMenuList();
        closeEditModal();
    };

    saveEditButton.addEventListener('click', saveEditedMenu);
    cancelEditButton.addEventListener('click', closeEditModal);

    // --- データ管理 ---
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
                // 簡易的なバリデーション
                if (Array.isArray(importedData) && importedData.every(item => 'dishes' in item && 'ingredients' in item && 'tags' in item)) {
                    // 過去バージョンとの互換性のため、urlがない場合は空文字を追加
                    menus = importedData.map(item => ({...item, url: item.url || '' }));
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

