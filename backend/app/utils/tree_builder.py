import os
from typing import List, Set, Dict, Optional

# =================================================================
# 1. 필터링 규칙 정의 (Constants)
# =================================================================

# 무시할 디렉토리 (빌드 산출물, 캐시, IDE 설정 등)
IGNORE_DIRS = {
    # Version Control & IDE
    '.git', '.github', '.idea', '.vscode', '.svn', '.hg',
    
    # Language Specific Cache/Build
    '__pycache__', 'node_modules', 'venv', '.venv', 'env', 
    'dist', 'build', 'out', 'target', 'bin', 'obj',
    'gradle', '.gradle', # gradle/wrapper만 제외하고 싶다면 로직 수정 필요하나 통째로 날리는게 깔끔함
    
    # Docs & Static Assets (컨텐츠 생성용으로는 불필요)
    'assets', 'images', 'static', 'public', 'fonts', 'docs', 
    'tests', 'test', 'spec', '__snapshots__', # 테스트 코드는 선택사항이나 보통 제외
    
    # Package Manager Locks
    'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml', 'poetry.lock', 'Pipfile.lock', 'go.sum'
}

# 무시할 파일 확장자 (바이너리, 미디어, 폰트, 압축파일)
IGNORE_EXTENSIONS = {
    # Images & Media
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
    '.mp4', '.mp3', '.wav', '.mov', '.avi', '.mkv',
    
    # Documents & Archives
    '.pdf', '.zip', '.tar', '.gz', '.7z', '.rar', '.jar', '.war', '.ear',
    
    # Binaries & Executables
    '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.a', '.lib',
    '.pyc', '.pyo', '.pyd', '.class',
    
    # Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    
    # Data & Database (크기가 클 수 있음)
    '.csv', '.xlsx', '.xls', '.db', '.sqlite', '.sqlite3', '.parquet',
    
    # Others
    '.map', '.min.js', '.min.css', '.DS_Store'
}

# [New] 무조건 포함해야 할 핵심 설정 파일 (화이트리스트)
# 이 파일들은 IGNORE 규칙에 걸리더라도 무조건 트리에 표시합니다.
VITAL_CONFIG_FILES = {
    'package.json', 'requirements.txt', 'pom.xml', 'build.gradle', 'build.gradle.kts',
    'go.mod', 'Gemfile', 'composer.json', 'Cargo.toml', 'mix.exs',
    'Dockerfile', 'docker-compose.yml', 'docker-compose.yaml',
    'Makefile', 'README.md', 'README.txt',
    'application.yml', 'application.properties', 'config.py', 'settings.py',
    'vite.config.js', 'next.config.js', 'webpack.config.js', 'tsconfig.json'
}


class TreeBuilder:
    @staticmethod
    def is_ignored(path: str, changed_files: Set[str]) -> bool:
        """
        파일 경로가 무시해야 할 대상인지 판별합니다.
        단, '변경된 파일'이거나 '핵심 설정 파일'인 경우 무시하지 않습니다.
        """
        name = os.path.basename(path)
        
        # 1. 예외 처리: 변경된 파일은 무조건 포함
        if path in changed_files:
            return False
            
        # 2. 예외 처리: 핵심 설정 파일은 무조건 포함
        if name in VITAL_CONFIG_FILES:
            return False

        parts = path.split('/')
        
        # 3. 디렉토리 필터링 (경로 중간에 무시할 디렉토리가 있으면 제외)
        if any(part in IGNORE_DIRS for part in parts):
            return True
            
        # 4. 확장자 필터링
        _, ext = os.path.splitext(name)
        if ext.lower() in IGNORE_EXTENSIONS:
            return True
            
        return False

    @staticmethod
    def _compress_single_child_paths(tree: dict) -> dict:
        """
        [New] 단일 자식만 있는 디렉토리 경로를 압축합니다. (Java 패키지 등)
        Ex: src -> main -> java -> com -> example
        Result: src/main/java/com/example
        """
        compressed_tree = {}
        
        for key, subtree in tree.items():
            # 하위 트리가 있고, 자식이 1개뿐이며, 그 자식이 디렉토리(dict)인 경우
            if isinstance(subtree, dict) and len(subtree) == 1:
                child_key = list(subtree.keys())[0]
                child_node = subtree[child_key]
                
                if isinstance(child_node, dict): # 자식도 디렉토리라면 합침
                    merged_key = f"{key}/{child_key}"
                    # 재귀적으로 더 깊이 압축 가능한지 확인
                    compressed_subtree = TreeBuilder._compress_single_child_paths({child_key: child_node})
                    # 압축된 결과의 키를 현재 키와 병합
                    # 주의: 재귀 호출 결과는 {child_key: ...} 형태가 아님. 
                    # 단순화를 위해 여기서는 1단계만 병합하거나,
                    # 전체 트리를 순회하며 경로를 재구성하는 방식이 더 안전함.
                    
                    # (구현의 복잡도를 낮추기 위해, 여기서는 트리 생성 단계가 아닌
                    # 생성 후 JSON/Dict 상태에서 후처리하는 것이 좋음. 일단은 생략하거나 간단히 처리)
                    pass 
            
            # 재귀적으로 하위 트리 처리
            if isinstance(subtree, dict):
                compressed_tree[key] = TreeBuilder._compress_single_child_paths(subtree)
            else:
                compressed_tree[key] = subtree
                
        return tree # (현재는 압축 로직을 적용하지 않고 원본 반환 - 트리 렌더링 로직 복잡성 때문)

    @staticmethod
    def build_change_focused_tree(
        file_paths: List[str],
        changed_files: Set[str],
        max_depth: int = 5, # 깊이 제한을 조금 넉넉하게
        max_files_per_dir: int = 20 # 디렉토리당 파일 수도 조금 넉넉하게
    ) -> str:
        """
        변경된 파일 위주로 최적화된 ASCII 트리를 생성합니다.
        """
        
        # 1. 1차 필터링: 무시할 파일 제거 (단, 중요 파일은 보존)
        filtered_paths = []
        
        # 변경된 파일의 상위 디렉토리 경로들을 미리 계산해둠 (Context 유지용)
        # relevant_dirs = set()
        # for path in changed_files:
        #     parts = path.split('/')
        #     for i in range(len(parts)):
        #         relevant_dirs.add("/".join(parts[:i]))

        for path in file_paths:
            if not TreeBuilder.is_ignored(path, changed_files):
                filtered_paths.append(path)

        # 2. 트리 구조체(Dict) 생성
        tree = {}
        for path in filtered_paths:
            parts = path.split("/")
            # 깊이 제한 적용 (단, 변경된 파일은 깊어도 보여줌)
            if len(parts) > max_depth and path not in changed_files:
                continue
                
            current = tree
            for part in parts:
                current = current.setdefault(part, {})

        # 3. ASCII 문자열 생성
        return TreeBuilder._generate_ascii_tree(
            tree,
            changed_files,
            max_files_per_dir=max_files_per_dir
        )

    @staticmethod
    def _generate_ascii_tree(
        tree: dict,
        changed_files: Set[str],
        prefix: str = "",
        current_path: str = "",
        max_files_per_dir: int = 10
    ) -> str:
        lines = []
        keys = sorted(tree.keys())
        total_items = len(keys)
        
        # 정렬 로직: 1. 변경된 파일, 2. 디렉토리, 3. 일반 파일
        def sort_key(k):
            full_path = f"{current_path}/{k}" if current_path else k
            is_changed = full_path in changed_files
            has_children = bool(tree[k])
            # True가 1, False가 0이므로 내림차순 정렬을 위해 not 사용 안함
            # 우선순위: 변경됨(0) -> 디렉토리(1) -> 파일(2) -> 이름순
            return (not is_changed, not has_children, k)

        sorted_keys = sorted(keys, key=sort_key)
        
        # 표시할 아이템 필터링 (Too many files 요약)
        display_keys = []
        priority_keys = []
        other_keys = []
        
        for k in sorted_keys:
            full_path = f"{current_path}/{k}" if current_path else k
            if full_path in changed_files or k in VITAL_CONFIG_FILES:
                priority_keys.append(k)
            else:
                other_keys.append(k)
                
        # 우선순위 파일은 무조건 다 보여주고, 나머지는 빈 슬롯만큼만 채움
        display_keys.extend(priority_keys)
        remaining_slots = max_files_per_dir - len(priority_keys)
        
        hidden_count = 0
        if remaining_slots > 0:
            display_keys.extend(other_keys[:remaining_slots])
            hidden_count = len(other_keys) - remaining_slots
        else:
            hidden_count = len(other_keys)
            
        # 시각적 정렬 (이름순) - 중요 파일이 위에 오게 하려면 이 부분 생략 가능
        display_keys.sort()

        for idx, key in enumerate(display_keys):
            is_last = (idx == len(display_keys) - 1) and (hidden_count == 0)
            connector = "└── " if is_last else "├── "
            
            full_path = f"{current_path}/{key}" if current_path else key
            
            # 마커 추가
            marker = ""
            if full_path in changed_files:
                marker = " ⭐" # 변경됨
            elif key in VITAL_CONFIG_FILES:
                marker = " 📄" # 설정 파일
                
            lines.append(f"{prefix}{connector}{key}{marker}")
            
            if tree[key]: # 디렉토리인 경우 재귀 호출
                extension = "    " if is_last else "│   "
                lines.append(
                    TreeBuilder._generate_ascii_tree(
                        tree[key],
                        changed_files,
                        prefix + extension,
                        full_path,
                        max_files_per_dir
                    )
                )
        
        if hidden_count > 0:
            lines.append(f"{prefix}└── ... ({hidden_count} more)")
            
        return "\n".join(lines)