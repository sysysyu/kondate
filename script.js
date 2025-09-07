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
                // sort()が元の配列を変更しないようにコピーを作成して比較
                JSON.stringify([...lastMenu.dishes].sort()) === JSON.stringify([...menu.dishes].sort())
            )
        );
    
        if (candidatePool.length < 7) {
            showMessage("新しい献立が足りないため、全ての献立から選び直します。", false);
            candidatePool = [...menus]; // 参照ではなくコピーを使用
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
    
            // 予期せず候補が尽きた場合の安全装置
            if (availableMenus.length === 0) {
                showMessage("エラー: 献立候補がなくなりました。処理を中断します。");
                return; // 生成を中断
            }
    
            let pool = [...availableMenus];
            const originalPool = [...pool]; // フィルタリング前のプールを保持
    
            if (mazegohanCount >= 2) {
                const filteredPool = pool.filter(m => !isMazegohanMenu(m));
                if (filteredPool.length > 0) pool = filteredPool;
            }
    
            if (previousMenu && isSpecialMenu(previousMenu)) {
                const specialPool = pool.filter(isSpecialMenu);
                if (specialPool.length > 0) pool = specialPool;
            } else if (previousMenu && prevPrevMenu) {
                const prevCategory = getCategory(previousMenu);
                const prevPrevCategory = getCategory(prevPrevMenu);
                if (prevCategory !== 'other' && prevCategory === prevPrevCategory) {
                    const differentCategoryPool = pool.filter(m => getCategory(m) !== prevCategory);
                    if (differentCategoryPool.length > 0) pool = differentCategoryPool;
                }
            }
    
            // フィルターをかけた結果、候補が0になった場合はフィルター前の状態に戻す
            if (pool.length === 0) {
                pool = originalPool;
            }
    
            let selectedMenu = pool[Math.floor(Math.random() * pool.length)];
            newWeeklyPlan.push(selectedMenu);
    
            if (isMazegohanMenu(selectedMenu)) mazegohanCount++;
    
            // sort()の副作用を避けて、選択された献立を候補から削除
            const indexInAvailable = availableMenus.findIndex(m =>
                JSON.stringify([...m.dishes].sort()) === JSON.stringify([...selectedMenu.dishes].sort())
            );
    
            if (indexInAvailable > -1) {
                availableMenus.splice(indexInAvailable, 1);
            } else {
                console.warn("選択された献立を候補リストから見つけられませんでした。");
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

