import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

const SEO: React.FC<SEOProps> = ({
  title = 'Око Знаний - Онлайн сервис помощи студентам',
  description = 'Онлайн сервис помощи студентам: быстро, надёжно, по выгодной цене. Разместите задание и получите помощь от профессиональных экспертов.',
  keywords = 'помощь студентам, написание работ, курсовые, дипломы, рефераты, контрольные, эссе, онлайн помощь, студенческие работы, заказать работу',
  ogTitle,
  ogDescription,
  ogImage = '/og-image.jpg',
  ogUrl = 'https://okoznaniy.ru',
  canonical
}) => {
  useEffect(() => {
    // Устанавливаем title
    document.title = title;
    
    // Функция для установки или обновления мета-тега
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attribute = isProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };
    
    // Основные мета-теги
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('robots', 'index, follow');
    setMetaTag('googlebot', 'index, follow');
    setMetaTag('author', 'Око Знаний');
    setMetaTag('language', 'Russian');
    setMetaTag('geo.region', 'RU');
    setMetaTag('geo.placename', 'Россия');
    
    // Open Graph
    setMetaTag('og:type', 'website', true);
    setMetaTag('og:url', ogUrl, true);
    setMetaTag('og:title', ogTitle || title, true);
    setMetaTag('og:description', ogDescription || description, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', 'Око Знаний', true);
    setMetaTag('og:locale', 'ru_RU', true);
    
    // Twitter
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:url', ogUrl);
    setMetaTag('twitter:title', ogTitle || title);
    setMetaTag('twitter:description', ogDescription || description);
    setMetaTag('twitter:image', ogImage);
    
    // Canonical URL
    if (canonical) {
      let linkElement = document.querySelector('link[rel="canonical"]');
      if (!linkElement) {
        linkElement = document.createElement('link');
        linkElement.setAttribute('rel', 'canonical');
        document.head.appendChild(linkElement);
      }
      linkElement.setAttribute('href', canonical);
    }
    
    // Structured Data - Organization
    const orgScript = document.createElement('script');
    orgScript.type = 'application/ld+json';
    orgScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Око Знаний",
      "url": "https://okoznaniy.ru",
      "logo": "https://okoznaniy.ru/assets/logo.png",
      "description": "Онлайн сервис помощи студентам",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "RU"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer service",
        "availableLanguage": "Russian"
      }
    });
    document.head.appendChild(orgScript);
    
    // Structured Data - WebSite
    const websiteScript = document.createElement('script');
    websiteScript.type = 'application/ld+json';
    websiteScript.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Око Знаний",
      "url": "https://okoznaniy.ru",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://okoznaniy.ru/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    });
    document.head.appendChild(websiteScript);
    
    // Cleanup
    return () => {
      document.head.removeChild(orgScript);
      document.head.removeChild(websiteScript);
    };
  }, [title, description, keywords, ogTitle, ogDescription, ogImage, ogUrl, canonical]);
  
  return null;
};

export default SEO;
