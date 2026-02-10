import yaml
import re
from datetime import datetime
from app.schemas.blog import FinalPostRequest

class BlogPostBuilder:
    def __init__(self, request: FinalPostRequest):
        from app.utils.datetime_utils import now_kst
        self.req = request
        self.now = now_kst()
        self.date_str = self.now.strftime("%Y-%m-%d %H:%M:%S +0900")
        self.date_only = self.now.strftime("%Y-%m-%d")

    def build(self):
        theme = self.req.theme_type
        if theme == 'chirpy' or theme == 'tech_blog':
            return self._build_chirpy()
        elif theme == 'docs':
            return self._build_docs()
        else:
            return self._build_chirpy()

    # ... (_build_chirpy는 기존과 동일하므로 생략하거나 기존 코드 유지) ...
    def _build_chirpy(self):
        fm = {
            'title': self.req.title,
            'date': self.date_str,
            'categories': [],
            'tags': self.req.tags,
        }
        if self.req.category:
            fm['categories'] = [c.strip() for c in self.req.category.split('/') if c.strip()]
        if self.req.author: fm['author'] = self.req.author
        if self.req.description: fm['description'] = self.req.description
        if self.req.options.math: fm['math'] = True
        if self.req.options.mermaid: fm['mermaid'] = True
        if self.req.options.pin: fm['pin'] = True
        if self.req.image and self.req.image.path:
            fm['image'] = {'path': self.req.image.path, 'lqip': self.req.image.lqip, 'alt': self.req.image.alt}

        safe_title = self._slugify(self.req.title)
        safe_category = self.req.category.strip() if self.req.category else "Uncategorized"
        filename = f"{self.date_only}-{safe_title}.md"
        file_path = f"_posts/{safe_category}/{filename}"
        full_content = self._combine(fm, self.req.markdown_content)
        return file_path, full_content

    # =========================================================
    # 2. [Docs] 테마 빌더 (Just-the-Docs)
    # =========================================================
    def _build_docs(self):
        fm = {
            'layout': 'default',
            'title': self.req.title,
        }
        
        if self.req.options.nav_order:
            try: fm['nav_order'] = int(self.req.options.nav_order)
            except: fm['nav_order'] = self.req.options.nav_order

        # [입력값 분석]
        # user input: "usage-guide" (슬러그) OR "Usage Guide" (타이틀)
        raw_category = self.req.category.strip()
        
        if raw_category and raw_category != "Home":
            parts = [p.strip() for p in raw_category.split('/') if p.strip()]
            
            # 1. Front Matter용 Parent (메뉴 연결용 -> Title Case 필수)
            # 입력값이 "usage-guide"여도 "Usage Guide"로 변환해서 넣음
            if len(parts) > 0:
                fm['parent'] = self._ensure_title_style(parts[-1])
                if len(parts) > 1:
                    fm['grand_parent'] = self._ensure_title_style(parts[-2])

            # 2. 파일 시스템 저장용 Path (폴더명 -> 소문자/하이픈 슬러그)
            # 입력값이 "Usage Guide"여도 "usage-guide"로 변환해서 저장
            safe_folder_parts = [self._slugify(p) for p in parts]
            safe_parent_path = "/".join(safe_folder_parts)
            
            safe_title = self._slugify(self.req.title)
            file_path = f"docs/{safe_parent_path}/{safe_title}.md"
        else:
            safe_title = self._slugify(self.req.title)
            file_path = f"docs/{safe_title}.md"

        full_content = self._combine(fm, self.req.markdown_content)
        return file_path, full_content

    # --- Utils ---
    def _slugify(self, text: str) -> str:
        """[저장용] 파일명을 위해 소문자+하이픈 변환"""
        text = text.strip().lower() 
        text = re.sub(r'\s+', '-', text)
        text = re.sub(r'[\\/:*?"<>|]', '', text)
        return text

    def _ensure_title_style(self, text: str) -> str:
        """
        [표기용] 슬러그 형태로 의심되는 문자열을 Title Case로 변환
        예: 'usage-guide' -> 'Usage Guide'
        예: 'api-reference' -> 'Api Reference'
        """
        # 1. 이미 공백이 있거나 대문자가 섞여있으면 그대로 사용 (사용자가 의도한 타이틀로 간주)
        if ' ' in text or any(c.isupper() for c in text):
            return text
            
        # 2. 소문자 + 하이픈 조합이라면 변환 시도
        # usage-guide -> Usage Guide
        return text.replace('-', ' ').title()

    def _combine(self, fm_dict: dict, content: str) -> str:
        """YAML Block Style 강제"""
        yaml_str = yaml.dump(
            fm_dict, 
            allow_unicode=True, 
            default_flow_style=False, # Block Style
            sort_keys=False,
            width=1000
        )
        return f"---\n{yaml_str}---\n\n{content}"