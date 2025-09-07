document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tabs = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    const menuForm = document.getElementById('menu-form');
    const menuList = document.getElementById('menu-list');
    const searchInput = document.getElementById('search-input');
    const generateButton = document.getElementById('generate-button');
    const copyWeekPlanButton = document.getElementById('copy-week-plan-button');
    const weekPlan = document.getElementById('week-plan');
    const messageBox = document.getElementById('message-box');
    
    // Edit Modal
    const editModal = document.getElementById('edit-modal');
    const closeEditModalButton = document.getElementById('close-edit-modal-button');
    const editMenuForm = document.getElementById('edit-menu-form');
    let editTagButtons = document.querySelectorAll('#edit-menu-form .tag-button');

    // Settings Modal
    const settingsButton = document.getElementById('settings-button');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsButton = document.getElementById('close-settings-button');
    const exportButton = document.getElementById('export-data-button');
    const importInput = document.getElementById('import-data-input');

    // State
    let menus = [];
    let weeklyPlanData = [];
    let lastGeneratedMenus = [];
    let availableSwaps = [];
    let editingIndex = null;

    // --- Data Persistence (with Error Handling) ---
    const loadMenus = () => {
        const savedMenus = localStorage.getItem('menus');
        if (savedMenus) {
            try {
                const parsed = JSON.parse(savedMenus);
                if (Array.isArray(parsed)) {
                    menus = parsed;
                }
            } catch (e) {
                console.error("Error parsing menus from localStorage:", e);
                menus = []; // Reset on error
            }
        }
    };

    const saveMenus = () => {
        localStorage.setItem('menus', JSON.stringify(menus));
    };

    const loadWeeklyPlan = () => {
        const savedPlan = localStorage.getItem('weeklyPlan');
        if (savedPlan) {
            try {
                const parsed = JSON.parse(savedPlan);
                if (Array.isArray(parsed)) {
                    weeklyPlanData = parsed;
                }
            } catch (e) {
                console.error("Error parsing weekly plan from localStorage:", e);
                weeklyPlanData = [];
            }
        }
    };

    const saveWeeklyPlan = () => {
        localStorage.setItem('weeklyPlan', JSON.stringify(weeklyPlanData));
    };

    const loadLastGenerated = () => {
        const savedLast = localStorage.getItem('lastGeneratedMenus');
        if (savedLast) {
            try {
                 const parsed = JSON.parse(savedLast);
                 if(Array.isArray(parsed)) {
                    lastGeneratedMenus = parsed;
                 }
            } catch (e) {
                console.error("Error parsing last generated menus from localStorage:", e);
                lastGeneratedMenus = [];
            }
        }
    };

    const saveLastGenerated = () => {
        localStorage.setItem('lastGeneratedMenus', JSON.stringify(lastGeneratedMenus));
    };

    // --- Rendering (with added safety checks) ---
    const renderMenuList = (searchTerm = '') => {
        menuList.innerHTML = '';
        const filteredMenus = menus.filter(menu => {
            if (!menu || !Array.isArray(menu.dishes) || !Array.isArray(menu.tags)) return false;
            const searchLower = searchTerm.toLowerCase();
            const nameMatch = menu.dishes.some(dish => dish.toLowerCase().includes(searchLower));
            const tagMatch = menu.tags.some(tag => tag.toLowerCase().includes(searchLower));
            return nameMatch || tagMatch;
        });

        if (filteredMenus.length === 0 && searchTerm === '') {
            menuList.innerHTML = `<p class="text-slate-500 text-center col-span-full">献立を登録してください。</p>`;
            return;
        }
        if (filteredMenus.length === 0 && searchTerm !== '') {
            menuList.innerHTML = `<p class="text-slate-500 text-center col-span-full">検索結果がありません。</p>`;
            return;
        }

        filteredMenus.forEach((menu) => {
            const originalIndex = menus.findIndex(m => m.id === menu.id);
            if (originalIndex === -1) return;

            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md border border-slate-200 flex flex-col justify-between';
            const tagsHTML = menu.tags.map(tag => `<span class="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${tag}</span>`).join('');
            const dishesHTML = menu.dishes.map(dish => `<li>${dish}</li>`).join('');
            const urlHTML = menu.url ? `<a href="${menu.url}" target="_blank" class="text-sky-600 hover:underline break-all text-sm mb-3 block">レシピを見る</a>` : '';

            card.innerHTML = `
                <div>
                    <div class="flex flex-wrap gap-2 mb-3">${tagsHTML}</div>
                    <ul class="list-disc list-inside text-slate-700 mb-3">${dishesHTML}</ul>
                    ${urlHTML}
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <button data-index="${originalIndex}" class="edit-button bg-slate-200 text-slate-800 px-4 py-1 rounded-md text-sm font-semibold hover:bg-slate-300">編集</button>
                    <button data-index="${originalIndex}" class="delete-button bg-red-500 text-white px-4 py-1 rounded-md text-sm font-semibold hover:bg-red-600">削除</button>
                </div>`;
            menuList.appendChild(card);
        });
    };

    const renderWeekPlan = () => {
        weekPlan.innerHTML = '';
        const days = ['月', '火', '水', '木', '金', '土', '日'];
        if (!weeklyPlanData || weeklyPlanData.length === 0) {
             weekPlan.innerHTML = `<p class="text-slate-500 text-center col-span-full">「献立を決める」ボタンを押してください。</p>`;
            return;
        }
        weeklyPlanData.forEach((menu, index) => {
            if (!menu || !Array.isArray(menu.dishes) || !Array.isArray(menu.tags)) {
                console.error(`Skipping invalid menu item in weekly plan at index ${index}:`, menu);
                return; 
            }
            const card = document.createElement('div');
            card.className = 'bg-white p-5 rounded-lg shadow-md border border-slate-200';
            const tagsHTML = menu.tags.map(tag => `<span class="bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">${tag}</span>`).join('');
            const dishesHTML = menu.dishes.map(dish => `<li>${dish}</li>`).join('');
            const urlHTML = menu.url ? `<a href="${menu.url}" target="_blank" class="text-sky-600 hover:underline break-all text-sm mt-3 block">レシピを見る</a>` : '';
            card.innerHTML = `
                <div class="flex justify-between items-center mb-3">
                    <h3 class="text-xl font-bold text-indigo-700">${days[index]}曜日</h3>
                    <button data-day-index="${index}" class="edit-week-button bg-slate-200 text-slate-800 px-3 py-1 rounded-md text-sm font-semibold hover:bg-slate-300">編集</button>
                </div>
                <div class="flex flex-wrap gap-2 mb-3">${tagsHTML}</div>
                <ul class="list-disc list-inside text-slate-700">${dishesHTML}</ul>
                ${urlHTML}`;
            weekPlan.appendChild(card);
        });
    };
    
    // --- Event Listeners ---
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            const activeContent = document.getElementById(`tab-content-${tab.dataset.tab}`);
            if (activeContent) {
                activeContent.classList.add('active');
            }
        });
    });

    menuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dishes = e.target.dishes.value.split('\n').map(d => d.trim()).filter(d => d);
        const ingredients = e.target.ingredients.value.split('\n').map(i => i.trim()).filter(i => i);
        const url = e.target.url.value.trim();
        const tags = Array.from(e.target.querySelectorAll('.tag-button.active')).map(b => b.textContent);

        if (dishes.length === 0) {
            showMessage("献立を1つ以上入力してください。");
            return;
        }
        if (tags.length === 0) {
            showMessage("タグを1つ以上選択してください。");
            return;
        }

        menus.push({ id: Date.now(), dishes, ingredients, url, tags });
        saveMenus();
        renderMenuList();
        e.target.reset();
        menuForm.querySelectorAll('.tag-button').forEach(b => b.classList.remove('active'));
        showMessage("献立を登録しました。", false);
    });

    menuForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-button')) {
            e.target.classList.toggle('active');
        }
    });

    menuList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const index = parseInt(button.dataset.index);

        if (button.classList.contains('delete-button')) {
            menus.splice(index, 1);
            saveMenus();
            renderMenuList(searchInput.value);
            showMessage("献立を削除しました。", false);
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
                JSON.stringify([...(lastMenu.dishes || [])].sort()) === JSON.stringify([...(menu.dishes || [])].sort())
            )
        );
    
        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = [...menus];
            lastGeneratedMenus = [];
        }
    
        let newWeeklyPlan = [];
        let availableMenus = [...candidatePool];
        let mazegohanCount = 0;
    
        const isSpecialMenu = menu => menu && Array.isArray(menu.dishes) && menu.dishes.some(d => d.includes('混ぜご飯') || d.includes('豚汁'));
        const isMazegohanMenu = menu => menu && Array.isArray(menu.dishes) && menu.dishes.some(d => d.includes('混ぜご飯'));
        const getCategory = (menu) => {
            if (!menu || !Array.isArray(menu.tags)) return 'other';
            if (menu.tags.includes('和食') || menu.tags.includes('和風')) return 'japanese';
            if (menu.tags.includes('中華')) return 'chinese';
            if (menu.tags.includes('洋食') || menu.tags.includes('洋風')) return 'western';
            return 'other';
        };
    
        for (let i = 0; i < 7; i++) {
            const previousMenu = i > 0 ? newWeeklyPlan[i - 1] : null;
            const prevPrevMenu = i > 1 ? newWeeklyPlan[i - 2] : null;
    
            if (availableMenus.length === 0) {
                showMessage("エラー: 献立候補が尽きました。ユニークな献立が足りない可能性があります。");
                return;
            }
    
            let pool = [...availableMenus];
            let filteredPool;

            if (mazegohanCount >= 2) {
                filteredPool = pool.filter(m => !isMazegohanMenu(m));
                if (filteredPool.length > 0) pool = filteredPool;
            }
    
            if (previousMenu && isSpecialMenu(previousMenu)) {
                filteredPool = pool.filter(isSpecialMenu);
                if (filteredPool.length > 0) pool = filteredPool;
            } else if (previousMenu && prevPrevMenu) {
                const prevCategory = getCategory(previousMenu);
                const prevPrevCategory = getCategory(prevPrevMenu);
                if (prevCategory !== 'other' && prevCategory === prevPrevCategory) {
                    filteredPool = pool.filter(m => getCategory(m) !== prevCategory);
                    if (filteredPool.length > 0) pool = filteredPool;
                }
            }
    
            const selectedMenu = pool[Math.floor(Math.random() * pool.length)];

            if (!selectedMenu) {
                showMessage("予期せぬエラーで献立の選択に失敗しました。");
                return;
            }
    
            newWeeklyPlan.push(selectedMenu);
    
            if (isMazegohanMenu(selectedMenu)) mazegohanCount++;
    
            const indexInAvailable = availableMenus.findIndex(m => m.id === selectedMenu.id);
    
            if (indexInAvailable > -1) {
                availableMenus.splice(indexInAvailable, 1);
            }
        }
    
        weeklyPlanData = newWeeklyPlan;
        lastGeneratedMenus = [...weeklyPlanData];
        availableSwaps = availableMenus;
    
        saveWeeklyPlan();
        saveLastGenerated();
    
        renderWeekPlan();
    });

    copyWeekPlanButton.addEventListener('click', () => {
        if (!weeklyPlanData || weeklyPlanData.length < 7) {
            showMessage("献立が作成されていません。");
            return;
        }
        const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
        const textToCopy = weeklyPlanData.map((menu, index) => {
            if (!menu) return `${days[index]}\n(献立データエラー)`;
            const day = days[index];
            const dishes = (menu.dishes || []).map(d => `・${d}`).join('\n');
            const url = menu.url ? `URL：${menu.url}` : '';
            return `${day}\n${dishes}\n${url}`.trim();
        }).join('\n\n');

        navigator.clipboard.writeText(textToCopy).then(() => {
            showMessage("今週の献立をコピーしました。", false);
        }).catch(err => {
            showMessage("コピーに失敗しました。");
            console.error('Copy failed', err);
        });
    });

    weekPlan.addEventListener('click', (e) => {
        const button = e.target.closest('.edit-week-button');
        if (button) {
            const dayIndex = parseInt(button.dataset.dayIndex, 10);
            const menu = weeklyPlanData[dayIndex];
            if (menu && menu.id) {
                const originalIndex = menus.findIndex(m => m.id === menu.id);
                if (originalIndex !== -1) {
                    openEditModal(originalIndex);
                } else {
                    showMessage("元の献立が見つかりませんでした。");
                }
            }
        }
    });

    // --- Modal Logic ---
    function openEditModal(index) {
        editingIndex = index;
        const menu = menus[index];
        if (!menu) return;

        editMenuForm.dishes.value = (menu.dishes || []).join('\n');
        editMenuForm.ingredients.value = (menu.ingredients || []).join('\n');
        editMenuForm.url.value = menu.url || '';

        editTagButtons.forEach(button => {
            if ((menu.tags || []).includes(button.textContent)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        editModal.classList.remove('hidden');
    }

    closeEditModalButton.addEventListener('click', () => {
        editModal.classList.add('hidden');
        editingIndex = null;
    });
    
    editMenuForm.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-button')) {
            e.target.classList.toggle('active');
        }
    });

    editMenuForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (editingIndex === null || !menus[editingIndex]) return;

        const updatedMenu = {
            id: menus[editingIndex].id,
            dishes: e.target.dishes.value.split('\n').map(d => d.trim()).filter(d => d),
            ingredients: e.target.ingredients.value.split('\n').map(i => i.trim()).filter(i => i),
            url: e.target.url.value.trim(),
            tags: Array.from(e.target.querySelectorAll('.tag-button.active')).map(b => b.textContent)
        };

        menus[editingIndex] = updatedMenu;
        saveMenus();
        renderMenuList(searchInput.value);
        renderWeekPlan(); // 更新が週間献立に表示されている場合に備えて再描画
        editModal.classList.add('hidden');
        showMessage("献立を更新しました。", false);
    });

    // Settings Modal Logic
    settingsButton.addEventListener('click', () => settingsModal.classList.remove('hidden'));
    closeSettingsButton.addEventListener('click', () => settingsModal.classList.add('hidden'));

    exportButton.addEventListener('click', () => {
        const dataStr = JSON.stringify({ menus, weeklyPlanData, lastGeneratedMenus });
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'menu_app_backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    importInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data && Array.isArray(data.menus)) {
                    menus = data.menus;
                    weeklyPlanData = data.weeklyPlanData || [];
                    lastGeneratedMenus = data.lastGeneratedMenus || [];
                    saveMenus();
                    saveWeeklyPlan();
                    saveLastGenerated();
                    renderMenuList();
                    renderWeekPlan();
                    showMessage("データをインポートしました。", false);
                } else {
                    showMessage("無効なファイル形式です。");
                }
            } catch (error) {
                showMessage("ファイルの読み込みに失敗しました。");
                console.error("Import error:", error);
            } finally {
                settingsModal.classList.add('hidden');
                importInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    // --- Utility ---
    function showMessage(msg, isError = true) {
        messageBox.textContent = msg;
        messageBox.className = 'message-box';
        messageBox.classList.add(isError ? 'error' : 'success', 'show');
        setTimeout(() => messageBox.classList.remove('show'), 3000);
    }

    // --- Initial Load ---
    function initializeApp() {
        loadMenus();
        loadWeeklyPlan();
        loadLastGenerated();
        renderMenuList();
        renderWeekPlan();
        const initialTab = document.querySelector('.tab-button[data-tab="week"]');
        if (initialTab) {
            initialTab.click();
        }
    }

    initializeApp();
});

