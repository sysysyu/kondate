// ... existing code ... -->
    const generateButton = document.getElementById('generate-button');
    const copyWeekPlanButton = document.getElementById('copy-week-plan-button'); // New
    const weekPlan = document.getElementById('week-plan');
    const messageBox = document.getElementById('message-box');
    const shoppingListContainer = document.getElementById('shopping-list-container');
    const shoppingList = document.getElementById('shopping-list');
    
    // Edit Modal
    const editModal = document.getElementById('edit-modal');
    const editIndexInput = document.getElementById('edit-index');
    const editMenuInput = document.getElementById('edit-menu-input');
    const editIngredientsInput = document.getElementById('edit-ingredients-input');
    const editTagsContainer = document.getElementById('edit-tags-container');
    const editUrlInput = document.getElementById('edit-url-input');
    const saveEditButton = document.getElementById('save-edit-button');
    const cancelEditButton = document.getElementById('cancel-edit-button');

    // Settings Modal
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const exportButton = document.getElementById('export-button');
    const importButton = document.getElementById('import-button');
    const importFile = document.getElementById('import-file');
    
    // Tabs
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    // データ構造
    let menus = JSON.parse(localStorage.getItem('menus')) || [];
    let weeklyPlanData = JSON.parse(localStorage.getItem('weeklyPlanData')) || [];
    let lastGeneratedMenus = JSON.parse(localStorage.getItem('lastGeneratedMenus')) || [];
    let availableSwaps = [];

    // --- データ処理関数 ---
    const saveMenus = () => localStorage.setItem('menus', JSON.stringify(menus));
    const saveWeeklyPlan = () => localStorage.setItem('weeklyPlanData', JSON.stringify(weeklyPlanData));
    const saveLastGenerated = () => localStorage.setItem('lastGeneratedMenus', JSON.stringify(lastGeneratedMenus));

    // --- 描画関数 ---
    const renderMenuList = (searchTerm = '') => {
        menuList.innerHTML = '';
        const lowerCaseSearchTerm = searchTerm.toLowerCase();

        const filteredMenus = menus.filter(menu => {
            if (!searchTerm) return true;
            const inDishes = menu.dishes.some(d => d.toLowerCase().includes(lowerCaseSearchTerm));
            const inTags = menu.tags.some(t => t.toLowerCase().includes(lowerCaseSearchTerm));
            return inDishes || inTags;
        });

        if (filteredMenus.length === 0) {
            menuList.innerHTML = `<li class="text-slate-400">${searchTerm ? '該当する献立がありません。' : 'まだ献立が登録されていません。'}</li>`;
            return;
        }

        filteredMenus.forEach((menu) => {
            const originalIndex = menus.findIndex(originalMenu => originalMenu === menu);
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
                    <button data-index="${originalIndex}" class="edit-button icon-button" title="編集"><i class="fas fa-pencil-alt"></i></button>
                    <button data-index="${originalIndex}" class="delete-button icon-button delete" title="削除"><i class="fas fa-trash-alt"></i></button>
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
            if (!menu) return;

            const originalIndex = menus.findIndex(m => JSON.stringify(m.dishes.sort()) === JSON.stringify(menu.dishes.sort()));
            
            const menuItemsHtml = menu.dishes.map(dish => `<li class="text-slate-600">${dish}</li>`).join('');
            const urlHtml = menu.url ? `<a href="${menu.url}" target="_blank" rel="noopener noreferrer" class="recipe-link mt-2 block"><i class="fas fa-link mr-1"></i>レシピ</a>` : '';
            
            dayCard.innerHTML = `
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-lg text-indigo-600">${day}</h3>
                    <div class="flex gap-1">
                        ${originalIndex > -1 ? `<button data-original-index="${originalIndex}" class="edit-weekly-button icon-button" title="元の献立を編集"><i class="fas fa-pencil-alt"></i></button>` : ''}
                        <button data-index="${index}" class="swap-button icon-button" title="入れ替え"><i class="fas fa-sync-alt"></i></button>
                    </div>
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

    // --- Event Listeners & Logic ---
    const addMenu = () => {
        const dishes = menuInput.value.trim().split('\n').map(d => d.trim()).filter(Boolean);
        const ingredients = ingredientsInput.value.trim().split('\n').map(i => i.trim()).filter(Boolean);
        const tags = Array.from(tagsContainer.querySelectorAll('.tag-select-button.active')).map(btn => btn.dataset.tag);
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
        renderMenuList(searchInput.value); // Re-render with current search
        [menuInput, ingredientsInput, urlInput].forEach(input => input.value = '');
        tagsContainer.querySelectorAll('.tag-select-button.active').forEach(btn => btn.classList.remove('active'));
        showMessage("献立を登録しました。", false);
    };

    menuList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        const index = button.dataset.index;
        if (button.classList.contains('delete-button')) {
            if (confirm('この献立を削除しますか？')) {
                menus.splice(index, 1);
                saveMenus();
                renderMenuList(searchInput.value); // Re-render with current search
            }
        } else if (button.classList.contains('edit-button')) {
            openEditModal(index);
        }
    });
    
    searchInput.addEventListener('input', () => renderMenuList(searchInput.value));

    generateButton.addEventListener('click', () => {
        if (menus.length < 7) {
            showMessage(`日替わり献立には7種類以上の献立が必要です。(現在: ${menus.length}種類)`);
            return;
        }
        
        let candidatePool = menus.filter(menu => 
            !lastGeneratedMenus.some(lastMenu => 
                JSON.stringify(lastMenu.dishes.sort()) === JSON.stringify(menu.dishes.sort())
            )
        );

        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = menus;
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
            if (pool.length === 0) {
                showMessage("献立の組み合わせが見つかりませんでした。条件を緩めて再試行します。", false);
                pool = candidatePool; 
            }

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
        availableSwaps = availableMenus;
        
        saveWeeklyPlan();
        saveLastGenerated();

        renderWeekPlan();
        generateShoppingList();
    });

    // New: Copy Button Listener
    copyWeekPlanButton.addEventListener('click', () => {
        if (!weeklyPlanData || weeklyPlanData.length < 7) {
            showMessage('コピーする献立がありません。');
            return;
        }

        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        let textToCopy = '';

        weeklyPlanData.forEach((menu, index) => {
            textToCopy += `${days[index]}\n`;
            menu.dishes.forEach(dish => {
                textToCopy += `・${dish}\n`;
            });
            if (menu.url) {
                textToCopy += `URL：${menu.url}\n`;
            }
            if (index < 6) { // Add a blank line between days, but not after the last day
                textToCopy += '\n';
            }
        });

        // Create a temporary textarea to copy the text
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px'; // Move it off-screen
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if(successful) {
                showMessage('献立をクリップボードにコピーしました。', false);
            } else {
                showMessage('コピーに失敗しました。');
            }
        } catch (err) {
            showMessage('コピーに失敗しました。');
        }

        document.body.removeChild(textArea);
    });
    
    weekPlan.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        if (button.classList.contains('swap-button')) {
             if (availableSwaps.length === 0) {
                showMessage("入れ替えられる献立がありません。");
                return;
            }
            const dayIndex = parseInt(button.dataset.index, 10);
            const oldMenu = weeklyPlanData[dayIndex];
            const swapIndex = Math.floor(Math.random() * availableSwaps.length);
            const newMenu = availableSwaps[swapIndex];
            weeklyPlanData[dayIndex] = newMenu;
            availableSwaps.splice(swapIndex, 1);
            availableSwaps.push(oldMenu);
            saveWeeklyPlan();
            renderWeekPlan();
            generateShoppingList();
        } else if (button.classList.contains('edit-weekly-button')) {
            const originalIndex = button.dataset.originalIndex;
            openEditModal(originalIndex);
        }
    });

    const generateShoppingList = () => {
        if (!weeklyPlanData || weeklyPlanData.length === 0) return;
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
    
    // --- Edit Modal ---
    const openEditModal = (index) => {
        const menu = menus[index];
        editIndexInput.value = index;
        editMenuInput.value = menu.dishes.join('\n');
        editIngredientsInput.value = menu.ingredients.join('\n');
        editUrlInput.value = menu.url || '';
        
        editTagsContainer.querySelectorAll('.tag-select-button').forEach(btn => {
            btn.classList.toggle('active', menu.tags.includes(btn.dataset.tag));
        });
        
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
            tags: Array.from(editTagsContainer.querySelectorAll('.tag-select-button.active')).map(btn => btn.dataset.tag),
            url: editUrlInput.value.trim()
        };
        
        saveMenus();
        renderMenuList(searchInput.value); // Re-render with current search
        if(weeklyPlanData.length > 0) renderWeekPlan();
        closeEditModal();
    };

    saveEditButton.addEventListener('click', saveEditedMenu);
    cancelEditButton.addEventListener('click', closeEditModal);

    // --- Settings Modal ---
    settingsButton.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsButton.addEventListener('click', () => settingsModal.classList.add('hidden'));

    // --- Tab Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.toggle('hidden', content.id !== `tab-content-${targetTab}`);
                content.classList.toggle('active', content.id === `tab-content-${targetTab}`);
            });
        });
    });

    // --- Tag Select Logic ---
    document.querySelectorAll('.tag-select-button').forEach(button => {
        button.addEventListener('click', () => button.classList.toggle('active'));
    });

    // --- Data Management ---
    exportButton.addEventListener('click', () => {
        if (menus.length === 0) {
            alert('エクスポートする献立がありません。');
            return;
        }
        const dataStr = JSON.stringify(menus, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.ObjectURL(dataBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-list.json';
        a.click();
        URL.revokeObjectURL(url);
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
                    menus = importedData.map(item => ({...item, url: item.url || '' }));
                    saveMenus();
                    renderMenuList();
                    alert('献立リストをインポートしました。');
                } else {
                    throw new Error('ファイルの形式が正しくありません。');
                }
            } catch (error) {
                alert(`インポートに失敗しました: ${error.message}`);
            }
        };
        reader.readAsText(file);
        importFile.value = '';
    });

    addButton.addEventListener('click', addMenu);

    // Initial render
    renderMenuList();
    if (weeklyPlanData && weeklyPlanData.length === 7) {
        renderWeekPlan();
        generateShoppingList();
    } else {
        renderInitialWeekPlan();
    }
});


