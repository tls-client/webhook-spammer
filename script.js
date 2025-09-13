let stopSpam = false;

// ログ出力
function log(msg) {
  const logEl = document.getElementById("log");
  logEl.textContent += `\n${new Date().toLocaleTimeString()} - ${msg}`;
  logEl.scrollTop = logEl.scrollHeight;
}

// Webhook送信
async function sendWebhook(url, message, interval, useRateLimit) {
  if (stopSpam) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });

    if (res.status === 429 && useRateLimit) {
      const data = await res.json();
      log(`⏳ レート制限: ${data.retry_after}s 待機中`);
      await new Promise(r => setTimeout(r, data.retry_after * 1000));
      return sendWebhook(url, message, interval, useRateLimit);
    } else if (res.status >= 200 && res.status < 300) {
      log("✅ 送信成功");
    } else {
      log(`❌ 送信失敗: status ${res.status}`);
    }
  } catch (e) {
    log(`❌ 送信エラー: ${e.message}`);
  }

  if (!stopSpam && interval > 0) await new Promise(r => setTimeout(r, interval));
}

// メイン処理
async function startSpam(url, message, count, interval, useRateLimit) {
  stopSpam = false;
  for (let i = 0; i < count; i++) {
    if (stopSpam) break;
    await sendWebhook(url, message, interval, useRateLimit);
  }
  if (!stopSpam) log(`🎯 完了: ${count} 回送信しました`);
}

// ボタン操作
document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();

  const token = document.getElementById("token").value.trim();
  const guildId = document.getElementById("guildId").value.trim();
  const webhookName = document.getElementById("webhookName").value.trim();
  const message = document.getElementById("message").value.trim();
  const count = parseInt(document.getElementById("count").value, 10);
  const interval = parseInt(document.getElementById("interval").value, 10);

  const useRateLimit = true; // 必要ならチェックボックスに変更可能

  const btn = e.target.querySelector("button[type=submit]");
  btn.disabled = true;
  btn.textContent = "実行中...";

  // Webhook作成・取得
  (async () => {
    try {
      const headers = { Authorization: token, 'Content-Type': 'application/json' };
      const res = await fetch(`https://discord.com/api/v9/channels/${guildId}/webhooks`, { headers });
      const webhooks = await res.json();

      let webhook = webhooks.find(w => w.name === webhookName);

      if (!webhook) {
        const createRes = await fetch(`https://discord.com/api/v9/channels/${guildId}/webhooks`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: webhookName })
        });
        webhook = await createRes.json();
        log(`🚀 Webhook作成: ${webhook.url}`);
      } else {
        log(`🔄 既存Webhook検出: ${webhook.url}`);
      }

      await startSpam(webhook.url, message, count, interval, useRateLimit);
    } catch (err) {
      log(`❌ エラー: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = "開始";
    }
  })();
});

document.getElementById("stop").addEventListener("click", () => {
  stopSpam = true;
  log("🛑 停止しました");
});
