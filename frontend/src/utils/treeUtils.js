// ============================================================================
// 1. Helper: Flat List -> Tree Structure (Robust Version)
// ============================================================================
const buildTree = (posts) => {
    const root = { home: null, folders: [], files: [] };
    const folderMap = {};

    // Helper: 폴더가 없으면 생성하는 함수 (Virtual Folder 지원)
    const getOrCreateFolder = (categoryName) => {
        if (!folderMap[categoryName]) {
            folderMap[categoryName] = {
                title: categoryName, // 폴더명 (임시)
                path: `__virtual__/${categoryName}`, // 가상 경로
                category: categoryName,
                type: 'folder',
                children: [],
                is_virtual: true, // 가상 폴더 플래그
                nav_order: 999
            };
        }
        return folderMap[categoryName];
    };

    // 1. [Pass 1] 명시적인 폴더(index.md) 처리
    posts.forEach(p => {
        if (p.path === 'index.md') {
            root.home = p;
        } else if (p.is_index && p.category !== 'Home') {
            // 이미 존재하는 가상 폴더가 있다면 덮어씌움 (메타데이터 업데이트)
            const existing = folderMap[p.category];
            folderMap[p.category] = {
                ...p,
                type: 'folder',
                children: existing ? existing.children : [], // 기존 자식 유지
                is_virtual: false
            };
        }
    });

    // 2. [Pass 2] 파일 배치
    posts.forEach(p => {
        // 이미 처리된 index.md나 Home 파일은 건너뜀
        if (p.path === 'index.md') return;
        if (p.is_index && p.category !== 'Home') return;

        // Home 또는 Uncategorized는 루트 파일로
        if (p.category === 'Home' || p.category === 'Uncategorized' || !p.category) {
            root.files.push({ ...p, type: 'file' });
            return;
        }

        // 해당 카테고리 폴더 가져오기 (없으면 자동 생성)
        const targetFolder = getOrCreateFolder(p.category);
        targetFolder.children.push({ ...p, type: 'file' });
    });

    // 3. 정렬 (Sorting)
    const sorter = (a, b) => (a.nav_order ?? 999) - (b.nav_order ?? 999);
    
    root.folders = Object.values(folderMap).sort(sorter);
    root.folders.forEach(f => f.children.sort(sorter));
    root.files.sort(sorter);

    return root;
};