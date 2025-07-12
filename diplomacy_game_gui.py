import tkinter as tk
from tkinter import ttk, messagebox
import random
import math

settings = {
    "starting_literacy": 50,
    "starting_capital": 50,
    "investment_range": (1, 10, 0, 7),
    "diplomacy_range": (1, 10, 0, 7),
    "trade_range": (1, 10, 0, 7)
}

class Player:
    def __init__(self, name):
        self.name = name
        self.literacy = settings["starting_literacy"]
        self.technology = 1
        self.capital = settings["starting_capital"]
        self.diplomacy = {}

    def assign_diplomacy(self, other_players):
        for player in other_players:
            if player.name != self.name:
                self.diplomacy[player.name] = 0

class TradeCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["trade_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))
        self.LKRatio = random.uniform(0, 1)

class InvestmentCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["investment_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))
        self.LKRatio = random.uniform(0, 1)

class DiplomacyCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["diplomacy_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))

class GameGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Card Game")
        self.players = []
        self.current_player_index = 0
        self.round_counter = 1
        self.main_menu()

    def main_menu(self):
        self.clear()
        ttk.Label(self.root, text="Main Menu", font=("Arial", 18)).pack(pady=10)
        ttk.Button(self.root, text="Settings", command=self.settings_menu).pack(pady=5)
        ttk.Button(self.root, text="New Game", command=self.setup_players).pack(pady=5)
        ttk.Button(self.root, text="Quit", command=self.root.quit).pack(pady=5)

    def settings_menu(self):
        self.clear()
        ttk.Label(self.root, text="Game Settings", font=("Arial", 16)).pack(pady=10)
        self.inputs = {}
        fields = [
            ("Starting Literacy", "starting_literacy"),
            ("Starting Capital", "starting_capital"),
            ("Investment Payoff Low", "inv_pay_low"),
            ("Investment Payoff High", "inv_pay_high"),
            ("Investment Penalty Low", "inv_pen_low"),
            ("Investment Penalty High", "inv_pen_high"),
            ("Diplomacy Payoff Low", "dip_pay_low"),
            ("Diplomacy Payoff High", "dip_pay_high"),
            ("Diplomacy Penalty Low", "dip_pen_low"),
            ("Diplomacy Penalty High", "dip_pen_high"),
            ("Trade Payoff Low", "trd_pay_low"),
            ("Trade Payoff High", "trd_pay_high"),
            ("Trade Penalty Low", "trd_pen_low"),
            ("Trade Penalty High", "trd_pen_high"),
        ]
        for label, key in fields:
            frame = ttk.Frame(self.root)
            frame.pack(fill='x', padx=10, pady=2)
            ttk.Label(frame, text=label, width=25).pack(side='left')
            entry = ttk.Entry(frame)
            entry.pack(side='left', expand=True, fill='x')
            self.inputs[key] = entry
        ttk.Button(self.root, text="Save Settings", command=self.save_settings).pack(pady=10)
        ttk.Button(self.root, text="Back", command=self.main_menu).pack()

    def save_settings(self):
        try:
            settings["starting_literacy"] = int(self.inputs["starting_literacy"].get() or 50)
            settings["starting_capital"] = int(self.inputs["starting_capital"].get() or 50)
            def extract_range(prefix):
                return (
                    float(self.inputs[f"{prefix}_pay_low"].get() or 1),
                    float(self.inputs[f"{prefix}_pay_high"].get() or 10),
                    float(self.inputs[f"{prefix}_pen_low"].get() or 0),
                    float(self.inputs[f"{prefix}_pen_high"].get() or 7),
                )
            settings["investment_range"] = extract_range("inv")
            settings["diplomacy_range"] = extract_range("dip")
            settings["trade_range"] = extract_range("trd")
            messagebox.showinfo("Success", "Settings saved!")
            self.main_menu()
        except ValueError:
            messagebox.showerror("Error", "Please enter valid numeric values.")

    def setup_players(self):
        self.clear()
        self.player_entries = []
        ttk.Label(self.root, text="Enter Player Names", font=("Arial", 14)).pack(pady=10)
        self.num_players = tk.IntVar(value=2)
        spin = ttk.Spinbox(self.root, from_=2, to=6, textvariable=self.num_players, width=5, command=self.generate_player_fields)
        spin.pack()
        self.fields_frame = ttk.Frame(self.root)
        self.fields_frame.pack(pady=5)
        self.generate_player_fields()
        ttk.Button(self.root, text="Start Game", command=self.start_game).pack(pady=10)
        ttk.Button(self.root, text="Back", command=self.main_menu).pack()

    def generate_player_fields(self):
        for widget in self.fields_frame.winfo_children():
            widget.destroy()
        self.player_entries.clear()
        for i in range(self.num_players.get()):
            frame = ttk.Frame(self.fields_frame)
            frame.pack()
            ttk.Label(frame, text=f"Player {i+1}:").pack(side='left')
            entry = ttk.Entry(frame)
            entry.pack(side='left')
            self.player_entries.append(entry)

    def start_game(self):
        self.players.clear()
        for entry in self.player_entries:
            name = entry.get().strip()
            if name:
                self.players.append(Player(name))
        if len(self.players) < 2:
            messagebox.showerror("Error", "At least 2 players are required.")
            return
        for player in self.players:
            player.assign_diplomacy(self.players)
        self.current_player_index = 0
        self.round_counter = 1
        self.tradecards = [TradeCard() for _ in range(20)]
        self.investmentcards = [InvestmentCard() for _ in range(20)]
        self.diplomacycards = [DiplomacyCard() for _ in range(20)]
        self.next_turn()
        
    def card_info(self, card, label):
        frame = ttk.Frame(self.root)
        frame.pack(pady=2)
        ttk.Label(frame, text=f"{label}Card ID: {card.deets}").pack()
        if hasattr(card, 'LKRatio'):
            ttk.Label(frame, text=f"Payoff: +{card.pay_off:.2f}, Penalty: -{card.penalty:.2f}, Odds: {100 * (1 - card.odds):.2f}%, L/K: {card.LKRatio:.2f}").pack()
        else:
            ttk.Label(frame, text=f"Payoff: +{card.pay_off:.2f}, Penalty: -{card.penalty:.2f}, Odds: {100 * (1 - card.odds):.2f}%").pack()
        return frame
    
    def next_turn(self):
        if self.current_player_index >= len(self.players):
            self.current_player_index = 0
            self.round_counter += 1
        self.clear()
        player = self.players[self.current_player_index]
        ttk.Label(self.root, text=f"Round {self.round_counter}", font=("Arial", 14)).pack(pady=5)
        ttk.Label(self.root, text=f"{player.name}'s Turn", font=("Arial", 12)).pack(pady=5)

        self.inv_card = random.choice(self.investmentcards)
        self.dip_card = random.choice(self.diplomacycards)
        self.trd_card = random.choice(self.tradecards)

        self.card_info(self.inv_card, "Investment")
        ttk.Button(self.root, text="Invest", command=lambda: self.play_card('I')).pack(pady=5)

        self.card_info(self.dip_card, "Diplomacy")
        ttk.Button(self.root, text="Diplomacy", command=lambda: self.play_card('D')).pack(pady=5)

        self.card_info(self.trd_card, "Trade")
        ttk.Button(self.root, text="Trade", command=lambda: self.play_card('T')).pack(pady=5)

    def play_card(self, choice):
        player = self.players[self.current_player_index]
        card = {'I': self.inv_card, 'D': self.dip_card, 'T': self.trd_card}[choice]
        roll = random.randint(1, 12)
        threshold = 12 - math.floor(card.odds * 12)
        result = ""
        if choice == 'I':
            if roll >= threshold:
                inc = card.pay_off / (player.literacy + player.capital)
                player.technology += inc
                player.literacy -= card.pay_off * card.LKRatio
                player.capital -= card.pay_off * (1 - card.LKRatio)
                result = f"Tech +{inc:.4f}, Literacy and Capital reduced"
            else:
                player.literacy -= card.penalty * card.LKRatio
                player.capital -= card.penalty * (1 - card.LKRatio)
                result = f"Investment failed. Literacy and Capital reduced"
        elif choice == 'D':
            partner = random.choice([p for p in self.players if p != player])
            if roll >= threshold:
                player.diplomacy[partner.name] += card.pay_off
                result = f"Diplomacy with {partner.name} +{card.pay_off:.2f}"
            else:
                player.diplomacy[partner.name] -= card.penalty
                result = f"Diplomacy with {partner.name} -{card.penalty:.2f}"
        elif choice == 'T':
            partner = random.choice([p for p in self.players if p != player])
            if roll >= threshold:
                gain = (card.pay_off * player.technology) + player.diplomacy[partner.name]
                player.capital += gain * (1 - card.LKRatio)
                player.literacy += gain * card.LKRatio
                result = f"Trade succeeded. Literacy and Capital increased"
            else:
                loss = card.penalty - player.diplomacy[partner.name]
                player.capital -= loss * (1 - card.LKRatio)
                player.literacy -= loss * card.LKRatio
                result = f"Trade failed. Literacy and Capital decreased"
        messagebox.showinfo("Turn Result", f"Roll: {roll} (Target ≥ {threshold})\n{result}")
        self.current_player_index += 1
        self.next_turn()

    def clear(self):
        for widget in self.root.winfo_children():
            widget.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = GameGUI(root)
    root.mainloop()
