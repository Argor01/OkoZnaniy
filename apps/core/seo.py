"""SEO: robots.txt, sitemap.xml и серверный пре-рендер знаний для поисковых ботов."""
import json
import re

from django.http import HttpResponse
from django.utils.html import escape
from django.views.decorators.cache import cache_page

from apps.knowledge.models import Question, Article

BASE_URL = "https://okoznaniy.ru"
ORG = {
    "@type": "Organization",
    "name": "Око Знаний",
    "logo": {"@type": "ImageObject", "url": f"{BASE_URL}/assets/logo.png"},
}


def _author_name(user):
    if not user:
        return "Око Знаний"
    full = (getattr(user, "get_full_name", lambda: "")() or "").strip()
    return full or getattr(user, "display_username", "") or getattr(user, "username", "") or "Пользователь"


def _truncate(text, limit=160):
    text = re.sub(r"\s+", " ", (text or "").strip())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def robots_txt(request):
    lines = [
        "User-agent: *",
        "Allow: /$",
        "Allow: /knowledge",
        "Allow: /knowledge-base",
        "Allow: /become-expert",
        "Allow: /become-partner",
        "Disallow: /api/",
        "Disallow: /django-admin/",
        "Disallow: /admin",
        "Disallow: /wallet",
        "Disallow: /orders-feed",
        "Disallow: /create-order",
        "Disallow: /works",
        "Disallow: /shop",
        "Disallow: /support",
        "",
        f"Sitemap: {BASE_URL}/sitemap.xml",
        "",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain; charset=utf-8")


def _url_node(loc, lastmod=None, changefreq="weekly", priority="0.6"):
    node = f"<url><loc>{escape(loc)}</loc>"
    if lastmod is not None:
        node += f"<lastmod>{lastmod.date().isoformat()}</lastmod>"
    node += f"<changefreq>{changefreq}</changefreq><priority>{priority}</priority></url>"
    return node


@cache_page(60 * 30)
def sitemap_xml(request):
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        _url_node(f"{BASE_URL}/", changefreq="daily", priority="1.0"),
        _url_node(f"{BASE_URL}/knowledge", changefreq="daily", priority="0.9"),
        _url_node(f"{BASE_URL}/knowledge-base", changefreq="daily", priority="0.9"),
        _url_node(f"{BASE_URL}/become-expert", changefreq="monthly", priority="0.7"),
        _url_node(f"{BASE_URL}/become-partner", changefreq="monthly", priority="0.7"),
    ]
    for q in Question.objects.only("id", "updated_at").iterator():
        parts.append(_url_node(f"{BASE_URL}/knowledge/{q.id}", lastmod=q.updated_at, priority="0.8"))
    for a in Article.objects.only("id", "updated_at").iterator():
        parts.append(_url_node(f"{BASE_URL}/knowledge-base/{a.id}", lastmod=a.updated_at, priority="0.7"))
    parts.append("</urlset>")
    return HttpResponse("".join(parts), content_type="application/xml; charset=utf-8")


def _render_html(title, description, canonical, jsonld, body_html):
    ld = json.dumps(jsonld, ensure_ascii=False)
    return HttpResponse(
        f"""<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)}</title>
<meta name="description" content="{escape(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="{escape(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="{escape(title)}">
<meta property="og:description" content="{escape(description)}">
<meta property="og:url" content="{escape(canonical)}">
<meta property="og:site_name" content="Око Знаний">
<meta property="og:locale" content="ru_RU">
<script type="application/ld+json">{ld}</script>
</head>
<body>
{body_html}
<hr>
<p><a href="{escape(canonical)}">Открыть на Око Знаний</a></p>
</body>
</html>""",
        content_type="text/html; charset=utf-8",
    )


def _render_question(question):
    canonical = f"{BASE_URL}/knowledge/{question.id}"
    answers = list(question.answers.select_related("author").all())
    best = next((a for a in answers if a.is_best_answer), None)
    others = [a for a in answers if a is not best]

    def answer_ld(ans):
        return {
            "@type": "Answer",
            "text": ans.content,
            "dateCreated": ans.created_at.isoformat(),
            "upvoteCount": ans.likes_count,
            "author": {"@type": "Person", "name": _author_name(ans.author)},
            "url": f"{canonical}#answer-{ans.id}",
        }

    main_entity = {
        "@type": "Question",
        "name": question.title,
        "text": question.description or question.title,
        "answerCount": len(answers),
        "dateCreated": question.created_at.isoformat(),
        "author": {"@type": "Person", "name": _author_name(question.author)},
    }
    if best:
        main_entity["acceptedAnswer"] = answer_ld(best)
    if others:
        main_entity["suggestedAnswer"] = [answer_ld(a) for a in others]

    jsonld = {"@context": "https://schema.org", "@type": "QAPage", "mainEntity": main_entity}

    if answers:
        answers_html = "".join(
            f'<div id="answer-{a.id}"><h3>Ответ{" (лучший)" if a.is_best_answer else ""} от {escape(_author_name(a.author))}</h3>'
            f"<p>{escape(a.content)}</p><p>Лайков: {a.likes_count}</p></div>"
            for a in answers
        )
    else:
        answers_html = "<p>Пока нет ответов. Станьте первым, кто ответит.</p>"

    body = (
        f"<article><h1>{escape(question.title)}</h1>"
        f"<p><strong>Категория:</strong> {escape(question.category or 'Общее')}</p>"
        f"<p>{escape(question.description or '')}</p>"
        f"<h2>Ответы ({len(answers)})</h2>{answers_html}</article>"
    )
    title = f"{question.title} — Око ответы"
    description = _truncate(question.description or (best.content if best else question.title))
    return _render_html(title, description, canonical, jsonld, body)


def _render_article(article):
    canonical = f"{BASE_URL}/knowledge-base/{article.id}"
    jsonld = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "articleBody": article.description or "",
        "datePublished": article.created_at.isoformat(),
        "dateModified": article.updated_at.isoformat(),
        "author": {"@type": "Person", "name": _author_name(article.author)},
        "publisher": ORG,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
    }
    meta = []
    if article.work_type:
        meta.append(f"<strong>Тип работы:</strong> {escape(article.work_type)}")
    if article.subject:
        meta.append(f"<strong>Предмет:</strong> {escape(article.subject)}")
    meta_html = ("<p>" + " · ".join(meta) + "</p>") if meta else ""
    body = (
        f"<article><h1>{escape(article.title)}</h1>{meta_html}"
        f"<div>{escape(article.description or '')}</div></article>"
    )
    title = f"{article.title} — База знаний Око Знаний"
    description = _truncate(article.description or article.title)
    return _render_html(title, description, canonical, jsonld, body)


def _render_questions_list():
    canonical = f"{BASE_URL}/knowledge"
    questions = list(Question.objects.select_related("author").order_by("-created_at")[:100])
    items = "".join(
        f'<li><a href="{BASE_URL}/knowledge/{q.id}">{escape(q.title)}</a></li>'
        for q in questions
    )
    jsonld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "Око ответы — вопросы и ответы",
        "url": canonical,
    }
    body = f"<h1>Око ответы</h1><p>Вопросы студентов и ответы экспертов.</p><ul>{items}</ul>"
    return _render_html(
        "Око ответы — вопросы и ответы студентов | Око Знаний",
        "База вопросов и ответов: студенты спрашивают, эксперты отвечают. Найдите готовый ответ или задайте свой вопрос.",
        canonical, jsonld, body,
    )


def _render_articles_list():
    canonical = f"{BASE_URL}/knowledge-base"
    articles = list(Article.objects.select_related("author").order_by("-created_at")[:100])
    items = "".join(
        f'<li><a href="{BASE_URL}/knowledge-base/{a.id}">{escape(a.title)}</a></li>'
        for a in articles
    )
    jsonld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "name": "База знаний — статьи",
        "url": canonical,
    }
    body = f"<h1>База знаний</h1><p>Полезные статьи и материалы для студентов.</p><ul>{items}</ul>"
    return _render_html(
        "База знаний — статьи и материалы для студентов | Око Знаний",
        "Статьи и полезные материалы для студентов: курсовые, дипломы, рефераты и учебные темы.",
        canonical, jsonld, body,
    )


def prerender(request):
    """Отдаёт SEO-HTML по исходному пути (?path=/knowledge/123)."""
    path = request.GET.get("path", "/")
    path = path.split("?", 1)[0].rstrip("/") or "/"

    m = re.match(r"^/knowledge/(\d+)$", path)
    if m:
        q = Question.objects.select_related("author").filter(pk=m.group(1)).first()
        if q:
            return _render_question(q)

    m = re.match(r"^/knowledge-base/(\d+)$", path)
    if m:
        a = Article.objects.select_related("author").filter(pk=m.group(1)).first()
        if a:
            return _render_article(a)

    if path == "/knowledge":
        return _render_questions_list()
    if path == "/knowledge-base":
        return _render_articles_list()

    jsonld = {"@context": "https://schema.org", **ORG, "url": BASE_URL}
    body = "<h1>Око Знаний</h1><p>Помощь студентам, база знаний и ответы экспертов.</p>"
    return _render_html(
        "Око Знаний — помощь студентам, база знаний и ответы экспертов",
        "Онлайн-сервис помощи студентам: эксперты, база знаний, вопросы и ответы.",
        BASE_URL, jsonld, body,
    )
