import { PolicyPage } from "../../components/PolicyPage";
import { getLocale } from "../../lib/i18n";

export default async function CopyrightPage() {
  const en = (await getLocale()) === "en";
  return <PolicyPage kicker="COPYRIGHT" title={en ? "Respect creators and lawful use." : "尊重創作，也尊重合法使用。"} intro={en ? "Rights remain with each creator. OpenGames receives only the limited license needed to provide the platform service." : "作品權利仍屬各創作者；OpenGames 只取得提供平台服務所需的有限授權。"} sections={en ? [
    { title: "Uploader assurances", body: "Uploaders must own the work or hold the rights required for public display, performance, reproduction, and distribution. Do not upload unlicensed games, images, fonts, music, characters, or trademarks." },
    { title: "Each game has its own license", body: "The platform code uses the MIT License, but that does not mean every game does. The license and download settings on each game page control that game." },
    { title: "Copyright notices", body: "A valid notice should include the rights holder's identity, the original work, the URL of the allegedly infringing game, contact information, a good-faith statement, and a statement that the information is accurate. A legal-notice email address must be published before formal operation." },
    { title: "Response and appeal", body: "After receiving a credible notice, the platform may temporarily hide the content, contact the uploader, and preserve necessary records. Uploaders who believe the action was mistaken may provide proof of rights and a counter-notice." },
  ] : [
    { title: "上傳者的保證", body: "上傳者必須擁有作品，或取得公開展示、執行、重製與散布所需的權利。請不要上傳未授權的遊戲、圖片、字型、音樂、角色或商標。" },
    { title: "作品授權彼此獨立", body: "平台程式碼採 MIT License，不代表站內所有遊戲都採相同授權。每款作品頁的授權與下載設定才是該作品的依據。" },
    { title: "侵權通知", body: "有效通知應包含權利人身分、原作說明、涉嫌侵權作品網址、聯絡方式、善意聲明及資料正確聲明。正式營運前必須公布可接收法律通知的電子郵件。" },
    { title: "處理與申訴", body: "收到可信通知後，平台可暫時隱藏內容、聯絡上傳者並保存必要紀錄。若上傳者認為處置錯誤，可以提出權利證明與反通知。" },
  ]} />;
}
