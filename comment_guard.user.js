// ==UserScript==
// @name         抖音控评助手·半自动版
// @namespace    heihu-douyin
// @version      0.1.0
// @description  评论AI分类(正常/广告/同行截流) + 一键回花🌹 + 一键删除。操作走手机IP，服务器只做AI分类。
// @match        https://www.douyin.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ================= 配置区 =================
    const API = 'https://hardware-functional-seas-rocky.trycloudflare.com/api/classify';
    const FLOWER = '🌹🌹🌹';
    const SCAN_INTERVAL = 3000;          // 扫描间隔ms
    // 选择器（抖音网页版DOM，多候选兜底，实测后调整）
    const SEL = {
        commentItem: '[data-e2e="comment-item"], .comment-item, div[class*="comment-item"]',
        commentText: '[data-e2e="comment-text"], .comment-content, div[class*="comment-content"]',
        replyBtn:   '[data-e2e="comment-reply"], div[class*="reply"]',
        deleteBtn:  '[data-e2e="comment-delete"], div[class*="delete"]',
        replyInput: '[data-e2e="comment-reply-input"], textarea[class*="reply"], textarea, div[contenteditable="true"]',
        sendBtn:    '[data-e2e="comment-send"], div[class*="send"]',
        confirmBtn: '[data-e2e="dialog-confirm"], div[class*="confirm"], button:has-text("删除")',
    };
    // =========================================

    const TYPE_META = {
        normal:     { label: '正常', color: '#2e7d32' },
        suspicious: { label: '疑似', color: '#f9a825' },
        ad:         { label: '广告', color: '#c62828' },
        tonghang:   { label: '同行', color: '#ad1457' },
    };

    // ---------------- 悬浮面板 ----------------
    const panel = document.createElement('div');
    panel.id = 'hg-comment-guard';
    panel.innerHTML = `
      <style>
        #hg-comment-guard{position:fixed;right:10px;bottom:80px;z-index:99999;width:210px;background:rgba(30,30,30,.95);color:#fff;border-radius:12px;font-size:12px;font-family:-apple-system,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);overflow:hidden}
        #hg-guard-head{padding:8px 10px;background:#ff6b35;font-weight:700;font-size:13px;display:flex;justify-content:space-between;align-items:center;cursor:move}
        #hg-guard-head .min{background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:2px 8px;font-size:11px}
        #hg-guard-body{padding:8px 10px;max-height:300px;overflow-y:auto}
        .hg-cmt{border-bottom:1px solid rgba(255,255,255,.08);padding:6px 0}
        .hg-cmt:last-child{border:none}
        .hg-cmt .txt{color:#ddd;word-break:break-all;margin-bottom:4px}
        .hg-cmt .row{display:flex;align-items:center;gap:4px}
        .hg-tag{font-size:10px;padding:1px 6px;border-radius:8px;font-weight:700}
        .hg-btn{border:none;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:700}
        .hg-btn.flower{background:#d32f2f;color:#fff}
        .hg-btn.del{background:#424242;color:#ff8a80}
        .hg-btn.done{background:#388e3c;color:#fff}
        #hg-guard-foot{padding:6px 10px;background:rgba(0,0,0,.4);font-size:11px;color:#bbb}
      </style>
      <div id="hg-guard-head">🎛 控评助手 <button class="min" id="hg-min">收起</button></div>
      <div id="hg-guard-body"><div style="color:#bbb">正在扫描评论…（需先登录抖音网页版）</div></div>
      <div id="hg-guard-foot">已识别 <span id="hg-stat">0</span> 条</div>`;
    document.body.appendChild(panel);
    const bodyEl = document.getElementById('hg-guard-body');
    const statEl = document.getElementById('hg-stat');

    // ---------------- 状态 ----------------
    const processed = new Set();   // 已分类评论ID
    let count = 0;

    // ---------------- 分类 ----------------
    async function classify(text) {
        try {
            const r = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.slice(0, 200) })
            });
            const d = await r.json();
            return d.type || 'suspicious';
        } catch (e) {
            return 'suspicious';
        }
    }

    // ---------------- 回花（模拟人工） ----------------
    async function replyFlower(commentEl) {
        try {
            // 1. 点击回复按钮
            const rb = commentEl.querySelector(SEL.replyBtn) || findNear(commentEl, SEL.replyBtn);
            if (!rb) return alert('没找到回复按钮（选择器需适配）');
            rb.click();
            await sleep(500);
            // 2. 找输入框并输入
            const input = document.querySelector(SEL.replyInput);
            if (!input) return alert('没找到回复输入框（选择器需适配）');
            setNativeValue(input, FLOWER);
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(300);
            // 3. 点发送
            const sb = document.querySelector(SEL.sendBtn);
            if (sb) sb.click();
            // 4. 标记已回复
            markDone(commentEl, '🌹已回');
        } catch (e) {
            alert('回花失败: ' + e.message);
        }
    }

    // ---------------- 删除（模拟人工） ----------------
    async function deleteComment(commentEl) {
        try {
            const db = commentEl.querySelector(SEL.deleteBtn) || findNear(commentEl, SEL.deleteBtn);
            if (!db) return alert('没找到删除按钮（选择器需适配）');
            db.click();
            await sleep(500);
            // 可能有确认弹窗
            const cb = findVisible(SEL.confirmBtn);
            if (cb) cb.click();
            markDone(commentEl, '🗑已删');
        } catch (e) {
            alert('删除失败: ' + e.message);
        }
    }

    // ---------------- 工具函数 ----------------
    function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

    function setNativeValue(el, value) {
        const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype
                   : el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLDivElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
    }

    function findNear(el, sel) {
        // 在评论项内部/附近找
        return el.querySelector(sel) || (el.parentElement ? el.parentElement.querySelector(sel) : null);
    }

    function findVisible(sel) {
        const els = document.querySelectorAll(sel);
        for (const e of els) {
            const r = e.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return e;
        }
        return null;
    }

    function markDone(el, label) {
        const row = el.querySelector('.hg-row') || el;
        const old = el.querySelector('.hg-btn.done');
        if (old) { old.textContent = label; return; }
        const b = document.createElement('button');
        b.className = 'hg-btn done';
        b.textContent = label;
        el.appendChild(b);
    }

    // ---------------- 渲染评论 ----------------
    function renderComment(text, type, el) {
        const meta = TYPE_META[type] || TYPE_META.suspicious;
        const div = document.createElement('div');
        div.className = 'hg-cmt';
        div.innerHTML = `
          <div class="txt"></div>
          <div class="row">
            <span class="hg-tag" style="background:${meta.color}">${meta.label}</span>
            <button class="hg-btn flower">🌹回花</button>
            <button class="hg-btn del">删除</button>
          </div>`;
        div.querySelector('.txt').textContent = text.slice(0, 60);
        div.querySelector('.flower').onclick = () => replyFlower(el);
        div.querySelector('.del').onclick = () => deleteComment(el);
        bodyEl.prepend(div);
    }

    // ---------------- 扫描评论 ----------------
    function scan() {
        const items = document.querySelectorAll(SEL.commentItem);
        items.forEach(async (el) => {
            const tEl = el.querySelector(SEL.commentText);
            if (!tEl) return;
            const text = (tEl.textContent || '').trim();
            if (!text || processed.has(text)) return;
            processed.add(text);
            const type = await classify(text);
            count++;
            statEl.textContent = count;
            renderComment(text, type, el);
        });
    }

    // 轮询扫描
    setInterval(scan, SCAN_INTERVAL);
    // 面板收起/展开
    document.getElementById('hg-min').onclick = function () {
        const b = document.getElementById('hg-guard-body');
        b.style.display = b.style.display === 'none' ? 'block' : 'none';
    };
    console.log('[控评助手] 已启动，扫描中…');
})();
