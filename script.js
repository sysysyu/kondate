// ... existing code ... -->
    menuList.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
// ... existing code ... -->
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
                JSON.stringify([...lastMenu.dishes].sort()) === JSON.stringify([...menu.dishes].sort())
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
    
            if (availableMenus.length === 0) {
                showMessage("エラー: 献立候補が尽きました。ユニークな献立が足りない可能性があります。");
                console.error("Ran out of available menus to generate a full week.");
                return;
            }
    
            let pool = [...availableMenus];
            let filteredPool;

            // Rule 1: Mazegohan count limit
            if (mazegohanCount >= 2) {
                filteredPool = pool.filter(m => !isMazegohanMenu(m));
                if (filteredPool.length > 0) {
                    pool = filteredPool;
                }
            }
    
            // Rule 2: Special menu continuation OR category balancing
            if (previousMenu && isSpecialMenu(previousMenu)) {
                filteredPool = pool.filter(isSpecialMenu);
                if (filteredPool.length > 0) {
                    pool = filteredPool;
                }
            } else if (previousMenu && prevPrevMenu) {
                const prevCategory = getCategory(previousMenu);
                const prevPrevCategory = getCategory(prevPrevMenu);
                if (prevCategory !== 'other' && prevCategory === prevPrevCategory) {
                    filteredPool = pool.filter(m => getCategory(m) !== prevCategory);
                    if (filteredPool.length > 0) {
                        pool = filteredPool;
                    }
                }
            }
    
            // Select a menu from the final pool of candidates
            const selectedMenu = pool[Math.floor(Math.random() * pool.length)];

            if (!selectedMenu) {
                showMessage("予期せぬエラーで献立の選択に失敗しました。");
                console.error("selectedMenu is undefined. This should not happen.", { availableMenus, pool });
                return;
            }
    
            newWeeklyPlan.push(selectedMenu);
    
            if (isMazegohanMenu(selectedMenu)) {
                mazegohanCount++;
            }
    
            // Remove the selected menu from the main available list for the next iteration
            const indexInAvailable = availableMenus.findIndex(m =>
                JSON.stringify([...m.dishes].sort()) === JSON.stringify([...selectedMenu.dishes].sort())
            );
    
            if (indexInAvailable > -1) {
                availableMenus.splice(indexInAvailable, 1);
            } else {
                console.warn("Could not find the selected menu in the available list to remove it.");
            }
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
// ... existing code ... -->

