import { Locator, Page } from "playwright";
import { DONT_INPUT_VALUE } from "../values/commonValues";

export class DBExcelEditorTopPage {
  private readonly page: Page;

  private staticRoot: Locator;
  private cardScopes: Locator;
  private currentScope: Locator | null;

  constructor(page: Page) {
    this.page = page;
    this.staticRoot = page.locator("#root");
    this.cardScopes = this.staticRoot.locator("div.MuiContainer-root > div.MuiGrid-root > div.MuiGrid-root");
    this.currentScope = null;
  }

  async setInitialization(): Promise<boolean> {
    try {
        this.staticRoot = this.page.locator("#root");
        this.cardScopes = this.staticRoot.locator("div.MuiContainer-root > div.MuiGrid-root > div.MuiGrid-root");
        this.currentScope = null;
        await this.staticRoot.waitFor({ state: "attached" });
        return true;

    } catch {
        return false;

    }
  }

  async focusCard(index: number, flag: boolean = true): Promise<boolean> {
    try {
        const count = await this.cardScopes.count();
        if (flag && (index < 0 || index >= count)) {
          return false;
        } else if (!flag) {
          return true;
        } else {
          // nothing
        }
        this.currentScope = this.cardScopes.nth(index);
        await this.currentScope.waitFor({ state: "attached" });
        return true;

    } catch {
        this.currentScope = null;
        return false;
    }
  }

  async clickBackToTop(flag: boolean = true): Promise<boolean> {
    try {
          
        if (flag) {
            const target = this.staticRoot.getByRole("button", { name: "トップに戻る" });
            await target.click();
        } else {
            // nothing   
        }
        return true;
    } catch {
        return false;
    }
  }

  async clickNewConnectionSetting(flag: boolean = true): Promise<boolean> {
    try {
        if (flag) {
            const target = this.staticRoot.getByRole("button", { name: "新規接続設定" });
            await target.click();
        } {
            // nothing
        }
        return true;

    } catch {
        return false;
    }
  }

  async clickConnect(index: number, flag: boolean = true): Promise<boolean> {
      
      try {
        const focusResult = await this.focusCard(index);
        if (flag && (!focusResult || this.currentScope === null)) {
            return false;
        } else if (!flag) {
            return true;
        } else {
            // nothing
        }
        
        if (this.currentScope !== null) {
            // nothing
        } else {
            return false;
        }
        const actionScope = this.currentScope.locator("div.MuiCardActions-root");
        const target = actionScope.getByRole("button", { name: "接続", exact: true });
        await target.click();
        
        return true;

    } catch {
        return false;
    }
  }

  async clickEdit(index: number): Promise<boolean> {
    const focusResult = await this.focusCard(index);
    if (!focusResult || this.currentScope === null) {
        return false;
    } else {
          // nothing
    }

    try {
        const actionScope = this.currentScope.locator("div.MuiCardActions-root");
        const target = actionScope.getByRole("button", { name: "編集", exact: true });
        await target.click();
        return true;

    } catch {
        return false;
    }
  }
}