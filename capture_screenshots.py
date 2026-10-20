import os
from playwright.sync_api import sync_playwright

os.makedirs('screenshots', exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page.goto('http://localhost:5173')
    page.wait_for_timeout(2500)
    
    # 1. Editor view
    page.screenshot(path='screenshots/01_editor_view.png')
    
    # 2. Click Published View toggle
    pub_btn = page.get_by_role('button', name='Published View')
    if pub_btn.count() > 0:
        pub_btn.first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path='screenshots/02_published_view.png')
        
        # Scroll down published article
        page.evaluate('''() => {
            const el = document.querySelector('.published-prose') || document.querySelector('main');
            let parent = el;
            while (parent) {
                if (parent.scrollHeight > parent.clientHeight) {
                    parent.scrollTop = 500;
                    break;
                }
                parent = parent.parentElement;
            }
        }''')
        page.wait_for_timeout(600)
        page.screenshot(path='screenshots/03_published_scrolled.png')

        # 3. Binder collapsed
        collapse_btn = page.locator('button[title*="Collapse Codex Binder"]')
        if collapse_btn.count() > 0:
            collapse_btn.first.click()
            page.wait_for_timeout(600)
            page.screenshot(path='screenshots/04_published_fullwidth.png')
            
            # restore binder
            expand_btn = page.locator('button[title*="Open Codex Binder"]')
            if expand_btn.count() > 0:
                expand_btn.first.click()
                page.wait_for_timeout(400)
        
        # Back to Edit
        edit_btn = page.get_by_role('button', name='Edit', exact=True)
        if edit_btn.count() > 0:
            edit_btn.first.click()
            page.wait_for_timeout(500)

    # 4. Atlas view
    atlas_btn = page.get_by_role('button', name='Atlas')
    if atlas_btn.count() > 0:
        atlas_btn.first.click()
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/05_atlas_view.png')

    # 5. Knowledge Graph
    graph_btn = page.get_by_role('button', name='Knowledge Graph')
    if graph_btn.count() > 0:
        graph_btn.first.click()
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/06_knowledge_graph.png')

    # 6. Novel Studio
    novel_btn = page.get_by_role('button', name='Novel Studio')
    if novel_btn.count() > 0:
        novel_btn.first.click()
        page.wait_for_timeout(1500)
        page.screenshot(path='screenshots/07_novel_studio.png')

    browser.close()
    print('All screenshots taken!')
