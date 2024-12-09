// chatManager.js
// Handles chat logic only. UI updates via uiManager methods.

import { rollCombinedDiceExpression } from './dice.js';

export class ChatManager {
  constructor(app) {
    this.app = app;
  }

  addMessage(msgObj) {
    this.app.messages.push(msgObj);
    this.app.uiManager.renderLog();
  }

  handleCommandInput(e) {
    if (e.key === 'Enter') {
      const command = this.app.uiManager.commandInput.value.trim();
      this.app.uiManager.commandInput.value = '';

      if (!command) return;

      if (command.toLowerCase().startsWith('/roll')) {
        const parts = command.split(/\s+/);
        let recipients = null;
        let diceExprIndex = 1;

        if (parts.length > 2 && parts[1].toLowerCase() === '/w') {
          recipients = [];
          let i = 2;
          for (; i < parts.length; i++) {
            if (parts[i].match(/d/)) {
              diceExprIndex = i;
              break;
            } else {
              if (this.app.users.includes(parts[i])) {
                recipients.push(parts[i]);
              }
            }
          }
        }

        const diceExpr = parts.slice(diceExprIndex).join('');
        if (diceExpr) {
          const result = rollCombinedDiceExpression(diceExpr);
          if (recipients && recipients.length > 0) {
            if (!recipients.includes("DM")) recipients.push("DM");
            if (!recipients.includes(this.app.currentUser)) recipients.push(this.app.currentUser);
            this.addMessage({ text: result, sender: this.app.currentUser, private: true, recipients: recipients });
          } else {
            this.addMessage({ text: result, sender: this.app.currentUser, private: false });
          }
        } else {
          this.addMessage({ text: "No dice expression provided.", sender: "System", private: false });
        }

      } else if (command.startsWith('/')) {
        this.addMessage({ text: `Unrecognized command: ${command}`, sender: "System", private: false });
      } else {
        this.addMessage({ text: command, sender: this.app.currentUser, private: false });
      }
    }
  }
}
