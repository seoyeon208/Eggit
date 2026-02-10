import requests
from datetime import datetime

GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"

def fetch_github_stats(token: str, username: str) -> dict:
    """
    GitHub GraphQL API를 호출하여 유저의 종합 통계 데이터를 가져옵니다.
    """
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. 쿼리 정의 (기여도, 스타, 상위 언어)
    query = """
    query ($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          totalPullRequestContributions
          totalIssueContributions
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                color
                contributionCount
                date
              }
            }
          }
        }
        repositories(first: 100, ownerAffiliations: OWNER, orderBy: {field: STARGAZERS, direction: DESC}) {
          nodes {
            stargazerCount
            primaryLanguage {
              name
              color
            }
            languages(first: 5, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node {
                  name
                  color
                }
              }
            }
          }
        }
      }
    }
    """
    
    try:
        response = requests.post(
            GITHUB_GRAPHQL_URL, 
            json={"query": query, "variables": {"login": username}}, 
            headers=headers,
            timeout=10
        )
        response.raise_for_status()
        data = response.json().get("data", {}).get("user")
        
        if not data:
            return None

        # 2. 데이터 가공 (Raw Data -> Statistics)
        repos = data["repositories"]["nodes"]
        
        # 스타 수 합계
        total_stars = sum(repo["stargazerCount"] for repo in repos)
        
        # 언어별 사용량 집계
        lang_map = {}
        for repo in repos:
            if repo["languages"]:
                for edge in repo["languages"]["edges"]:
                    name = edge["node"]["name"]
                    size = edge["size"]
                    color = edge["node"]["color"]
                    
                    if name not in lang_map:
                        lang_map[name] = {"size": 0, "color": color}
                    lang_map[name]["size"] += size
        
        # 상위 3개 언어 추출 및 퍼센트 계산
        total_size = sum(item["size"] for item in lang_map.values())
        top_languages = []
        if total_size > 0:
            sorted_langs = sorted(lang_map.items(), key=lambda x: x[1]["size"], reverse=True)[:3]
            for name, info in sorted_langs:
                top_languages.append({
                    "name": name,
                    "color": info["color"],
                    "percentage": round((info["size"] / total_size) * 100, 1)
                })

        return {
            "total_commits": data["contributionsCollection"]["totalCommitContributions"],
            "total_prs": data["contributionsCollection"]["totalPullRequestContributions"],
            "total_issues": data["contributionsCollection"]["totalIssueContributions"],
            "total_stars": total_stars,
            "calendar": data["contributionsCollection"]["contributionCalendar"], # 잔디 데이터
            "top_languages": top_languages
        }

    except Exception as e:
        print(f"❌ GitHub API Error: {e}")
        return None