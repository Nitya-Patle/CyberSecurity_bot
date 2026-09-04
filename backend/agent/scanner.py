import os
import re
import urllib.parse
import requests
from typing import Dict, Any

def sanitize_url(url: str) -> bool:
    """Basic validation to ensure it's a properly formatted HTTP/HTTPS URL."""
    try:
        result = urllib.parse.urlparse(url)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except:
        return False

def heuristic_check(url: str) -> Dict[str, Any]:
    """Fallback heuristic check if Safe Browsing API fails or returns no match."""
    reasons = []
    confidence = 0
    verdict = "safe"
    
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    
    # 1. Suspicious TLDs
    suspicious_tlds = [".xyz", ".tk", ".ru", ".cc", ".pw", ".top"]
    if any(domain.endswith(tld) for tld in suspicious_tlds):
        reasons.append("Uses a top-level domain often associated with spam/malware.")
        confidence += 30
        
    # 2. IP-based URL
    ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    # Strip port if present
    domain_no_port = domain.split(':')[0]
    if ip_pattern.match(domain_no_port):
        reasons.append("URL uses an IP address instead of a domain name.")
        confidence += 40
        
    # 3. Excessive subdomains
    if len(domain.split('.')) > 4:
        reasons.append("Contains an unusually high number of subdomains.")
        confidence += 20
        
    # 4. URL Shorteners
    shorteners = ["bit.ly", "tinyurl.com", "t.co", "is.gd", "ow.ly", "buff.ly"]
    if any(shortener in domain for shortener in shorteners):
        reasons.append("Uses a URL shortener, which can hide the true destination.")
        confidence += 15
        
    # 5. Typosquatting
    targets = ["google", "paypal", "amazon", "apple", "microsoft", "netflix"]
    # Look for slight variations but not the exact domain
    for target in targets:
        if target in domain and not domain.endswith(f"{target}.com"):
            reasons.append(f"Domain appears to mimic a popular brand ({target}).")
            confidence += 50
            
    if confidence >= 50:
        verdict = "malicious"
        confidence = min(confidence, 99)
    elif confidence > 0:
        verdict = "suspicious"
    else:
        verdict = "safe"
        reasons.append("No heuristic red flags detected.")
        confidence = 100
        
    return {
        "verdict": verdict,
        "confidence": confidence,
        "reasons": reasons,
        "source": "heuristic"
    }

def scan_url(url: str) -> Dict[str, Any]:
    """Scans a URL using Google Safe Browsing API, falling back to heuristics."""
    url = url.strip()
    
    if not sanitize_url(url):
        return {
            "verdict": "suspicious",
            "confidence": 100,
            "reasons": ["Invalid URL format provided."],
            "source": "system"
        }
        
    api_key = os.getenv("SAFE_BROWSING_API_KEY", os.getenv("GOOGLE_API_KEY"))
    
    if api_key:
        endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
        payload = {
            "client": {
                "clientId": "cybersentinel",
                "clientVersion": "1.0"
            },
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [
                    {"url": url}
                ]
            }
        }
        
        try:
            response = requests.post(endpoint, json=payload, timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "matches" in data and len(data["matches"]) > 0:
                    matches = data["matches"]
                    threat_types = list(set([match.get("threatType", "") for match in matches]))
                    reasons = [f"Flagged by Google Safe Browsing as: {', '.join(threat_types)}"]
                    return {
                        "verdict": "malicious",
                        "confidence": 99,
                        "reasons": reasons,
                        "source": "safe_browsing"
                    }
                else:
                    # Safe Browsing returned empty, meaning no known threats found by them.
                    # We still run our heuristic check as a second layer.
                    return heuristic_check(url)
        except Exception as e:
            print(f"Safe Browsing API Error: {e}")
            # Fall through to heuristics
    
    # Fallback if API key missing or request failed
    return heuristic_check(url)
