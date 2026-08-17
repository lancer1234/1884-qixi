# EX RECYCLING BIN — Google Sheet setup

The GitHub Pages front end is already prepared to send anonymous submissions to a Google Apps Script Web App. The only account-specific value is the Apps Script `/exec` URL.

## 1. Create the Sheet

1. Create a new Google Sheet for the event.
2. In the Sheet, open **Extensions → Apps Script**.
3. Replace the default script with the contents of `google-apps-script/Code.gs` from this repository.
4. Save the project.

The first valid submission automatically creates a sheet tab named **EX RECYCLING BIN** with these columns:

- 投稿時間
- 匿名內容
- 狀態
- TRUE/FAKE
- 已使用
- 投稿ID
- 客戶端時間
- User Agent

## 2. Deploy Apps Script

1. In Apps Script choose **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Deploy and authorize the script.
6. Copy the Web App URL ending in `/exec`.

## 3. Connect the website

Edit `ex-recycling-config.js`:

```js
window.EX_RECYCLING_CONFIG = {
  endpoint: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
};
```

Commit that one-line configuration change. No changes to `index.html` or the submission code are required.

## Runtime behavior

- Submissions are anonymous and capped by the existing 300-character UI limit.
- Each submission gets a UUID so queued retries do not create duplicate rows.
- If the network drops, the browser keeps up to 100 pending submissions locally and retries when connectivity returns.
- If the endpoint has not been configured yet, submissions are only queued on that device and the UI explicitly says cloud submission is not configured.
- The Apps Script rejects empty submissions and payloads longer than 300 characters.

## Export to Excel

In Google Sheets use **File → Download → Microsoft Excel (.xlsx)**.
