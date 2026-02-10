import textwrap
import traceback # 에러 확인용
from tree_sitter_languages import get_parser, get_language

class FeatureExtractor:
    """
    Tree-sitter를 사용하여 코드의 핵심 구조(클래스/함수 시그니처 + 독스트링)만 추출
    """
    def __init__(self):
        self.parsers = {
            "py": get_parser("python"),
            "js": get_parser("javascript"),
            "jsx": get_parser("javascript"),
            "ts": get_parser("typescript"),
            "tsx": get_parser("typescript"),
            "java": get_parser("java"),
            "go": get_parser("go"),
        }
        
        self.langs = {
            "py": get_language("python"),
            "js": get_language("javascript"),
            "jsx": get_language("javascript"),
            "ts": get_language("typescript"),
            "tsx": get_language("typescript"),
            "java": get_language("java"),
            "go": get_language("go"),
        }

        # [핵심 수정] 언어별로 정확한 쿼리 정의
        self.QUERIES = {
            "py": """
                (class_definition) @class
                (function_definition) @func
            """,
            "js": """
                (class_declaration) @class
                (function_declaration) @func
                (method_definition) @method
                (arrow_function) @arrow
            """,
            "ts": """
                (class_declaration) @class
                (function_declaration) @func
                (method_definition) @method
                (interface_declaration) @interface
            """,
            "java": """
                (class_declaration) @class
                (method_declaration) @method
                (constructor_declaration) @constructor
            """,
            "go": """
                (type_declaration) @type
                (function_declaration) @func
                (method_declaration) @method
            """
        }
        # JS/TSX 등은 기본 매핑 공유
        self.QUERIES["jsx"] = self.QUERIES["js"]
        self.QUERIES["tsx"] = self.QUERIES["ts"]

    def extract_skeleton(self, filename: str, source_code: str) -> str:
        ext = filename.split('.')[-1].lower()
        
        parser = self.parsers.get(ext)
        language = self.langs.get(ext)
        query_str = self.QUERIES.get(ext)

        if not parser or not language or not query_str or not source_code:
            return ""

        try:
            tree = parser.parse(bytes(source_code, "utf8"))
            
            # 쿼리 생성
            query = language.query(query_str)
            captures = query.captures(tree.root_node)
            
            skeletons = []
            # 중복 제거를 위한 라인 추적 (한 줄에 여러 노드가 잡힐 경우 대비)
            processed_lines = set()

            for node, _ in captures:
                # 너무 작은 노드(1줄 미만)나 이미 처리된 라인은 스킵 가능
                start_line = node.start_point[0]
                if start_line in processed_lines:
                    continue
                
                # 코드 텍스트 추출
                code_text = node.text.decode('utf8')
                
                # 스켈레톤 변환
                skeleton = self._make_skeleton(code_text)
                if skeleton:
                    skeletons.append(skeleton)
                    processed_lines.add(start_line)

            if skeletons:
                return f"## File: {filename} (Structure)\n" + "\n\n".join(skeletons)
                
        except Exception as e:
            # [디버깅] Celery 로그에서 에러 원인을 확인하기 위해 출력
            print(f"❌ FeatureExtractor Error ({filename}): {e}")
            # traceback.print_exc() # 필요시 주석 해제
            return ""
            
        return ""

    def _make_skeleton(self, code_text: str) -> str:
        lines = code_text.splitlines()
        if not lines: return ""
        
        # 함수/클래스 정의부(Header)만 남기고 Body는 생략
        header = lines[0]
        
        # Decorator가 있는 경우(Python) 헤더 위에 포함
        # (Tree-sitter는 데코레이터까지 포함해서 노드를 잡아주는 경우가 많음, 
        # 만약 데코레이터가 잘린다면 위쪽 라인을 훑어야 함. 여기선 단순화)
        
        # 들여쓰기 감지 (보통 헤더 다음 줄의 들여쓰기를 기준으로 함)
        indent = "    " 
        if len(lines) > 1:
            for line in lines[1:]:
                stripped = line.lstrip()
                if stripped:
                    curr_indent = line[:len(line)-len(stripped)]
                    if len(curr_indent) > len(lines[0]) - len(lines[0].lstrip()): 
                        indent = curr_indent
                        break
        
        # 한 줄짜리 함수는 그대로 반환
        if len(lines) <= 2: 
            return code_text

        return f"{header}\n{indent}# ... (Implementation Hidden) ..."