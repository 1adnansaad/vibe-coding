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
        self.log_messages = []
        self.wealth_log = []
        
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
            ("Starting Literacy", "starting_literacy", settings["starting_literacy"]),
            ("Starting Capital", "starting_capital", settings["starting_capital"]),
            ("Investment Payoff Low", "inv_pay_low", settings["investment_range"][0]),
            ("Investment Payoff High", "inv_pay_high", settings["investment_range"][1]),
            ("Investment Penalty Low", "inv_pen_low", settings["investment_range"][2]),
            ("Investment Penalty High", "inv_pen_high", settings["investment_range"][3]),
            ("Diplomacy Payoff Low", "dip_pay_low", settings["diplomacy_range"][0]),
            ("Diplomacy Payoff High", "dip_pay_high", settings["diplomacy_range"][1]),
            ("Diplomacy Penalty Low", "dip_pen_low", settings["diplomacy_range"][2]),
            ("Diplomacy Penalty High", "dip_pen_high", settings["diplomacy_range"][3]),
            ("Trade Payoff Low", "trd_pay_low", settings["trade_range"][0]),
            ("Trade Payoff High", "trd_pay_high", settings["trade_range"][1]),
            ("Trade Penalty Low", "trd_pen_low", settings["trade_range"][2]),
            ("Trade Penalty High", "trd_pen_high", settings["trade_range"][3]),
        ]
        for label, key, default in fields:
            frame = ttk.Frame(self.root)
            frame.pack(fill='x', padx=10, pady=2)
            ttk.Label(frame, text=label, width=25).pack(side='left')
            entry = ttk.Entry(frame)
            entry.insert(0, str(default))
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
        self.clear()
        self.next_turn()



    def setup_log_box(self):
        log_frame = ttk.Frame(self.root)
        log_frame.pack(side='right', pady=10, fill='both', expand=True)
        ttk.Label(log_frame, text="Turn Log:").pack(anchor='w')

        self.log_box = tk.Text(log_frame, height=10, width=10, wrap='word', state='normal')
        self.log_box.pack(fill='both', padx=5, expand=True)

        # Define 5 cycling color styles
        log_colors = ['#2b4f81', '#6e4b2b', '#000000', '#6e4b2b', '#2b4f81']  # Blue-Brown-Black-Brown-Blue
        for i, color in enumerate(log_colors):
            self.log_box.tag_config(f'color{i}', foreground=color)
        self.log_box.tag_config('bold', font=('TkDefaultFont', 10, 'bold'))

        for idx, line in enumerate(self.log_messages):
            color_tag = f'color{idx % 5}'
            tags = (color_tag, 'bold') if idx == len(self.log_messages) - 1 else (color_tag,)
            self.log_box.insert('end', line + '\n', tags)

        self.log_box.config(state='disabled')
        self.log_box.see('end')


    def setup_player_stats_box(self):
        stats_frame = ttk.Frame(self.root)
        stats_frame.pack(side='left', pady=10, padx=10, fill='y')

        ttk.Label(stats_frame, text="Player Stats").pack(anchor='w')

        self.stats_box = tk.Text(stats_frame, height=15, width=40, state='normal')
        self.stats_box.pack(fill='both', expand=True)

        # Button for diplomacy matrix
        ttk.Button(stats_frame, text="<3 Diplomacy <3", command=self.show_diplomacy_matrix).pack(pady=5)


        stats_content = ""
        for player in self.players:
            stats_content += f"{player.name}\n"
            stats_content += f"  Literacy: {player.literacy:.2f}\n"
            stats_content += f"  Capital: {player.capital:.2f}\n"
            stats_content += f"  Technology: {player.technology:.2f}\n"
            stats_content += "-" * 30 + "\n"

        self.stats_box.insert('end', stats_content)
        self.stats_box.config(state='disabled')
        

    def card_info(self, card, label):
        frame = ttk.Frame(self.root)
        frame.pack(pady=2)
        ttk.Label(frame, text=f"{label}Card ID: {card.deets}").pack()
        if hasattr(card, 'LKRatio'):
            ttk.Label(frame, text=f"Payoff: +{card.pay_off:.2f}, Penalty: -{card.penalty:.2f}, Odds: {100 * (1 - card.odds):.2f}%, L/K: {card.LKRatio:.2f}").pack()
        else:
            ttk.Label(frame, text=f"Payoff: +{card.pay_off:.2f}, Penalty: -{card.penalty:.2f}, Odds: {100 * (1 - card.odds):.2f}%").pack()
        return frame
    
    def choose_partner(self, player, action_type):
        top = tk.Toplevel(self.root)
        top.title(f"Choose Partner for {action_type}")
        ttk.Label(top, text=f"{player.name}, choose a partner for {action_type}:").pack(pady=10)

        selected = tk.StringVar()

        def select_and_close(name):
            selected.set(name)
            top.destroy()

        for p in self.players:
            if p != player:
                if action_type == "Diplomacy":
                    stat_value = player.diplomacy.get(p.name, 0)
                    label = f"{p.name} (Diplomacy: {stat_value:.2f})"
                elif action_type == "Trade":
                    stat_value = player.diplomacy.get(p.name, 0)
                    label = f"{p.name} (Dip. XP: {stat_value:.2f})"
                else:
                    label = p.name
                ttk.Button(top, text=label, command=lambda name=p.name: select_and_close(name)).pack(pady=2, padx=20, fill='x')

        top.grab_set()
        top.wait_window()

        name = selected.get()
        return next((p for p in self.players if p.name == name), None)


    def next_turn(self):
        if self.current_player_index >= len(self.players):
            
            wealth_snapshot = [round(p.literacy + p.capital, 2) for p in self.players]
            self.wealth_log.append(wealth_snapshot)
            
            self.current_player_index = 0
            self.round_counter += 1
        # self.clear()

        # if not hasattr(self, "log_messages"):
        #     self.log_messages = []
        # if not hasattr(self, "wealth_log"):
        #     self.wealth_log = []

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

        # Log the card selection
        # card_log = (
        #     f"[Round {self.round_counter}] {player.name} drew cards: "
        #     f"Investment(ID {self.inv_card.deets}), Diplomacy(ID {self.dip_card.deets}), Trade(ID {self.trd_card.deets})"
        # )
        # self.log_turn(card_log)

        # log_frame = ttk.Frame(self.root)
        # log_frame.pack(pady=10, fill='both', expand=True)
        # ttk.Label(log_frame, text="Turn Log:").pack(anchor='w')
        # self.log_box = tk.Text(log_frame, height=10, state='normal', wrap='word')
        # self.log_box.pack(fill='both', padx=5, expand=True)
        # self.log_box.insert('end', '\n'.join(self.log_messages) + '\n')
        # self.log_box.config(state='disabled')

        btn_frame = ttk.Frame(self.root)
        btn_frame.pack(fill='x', side='bottom')
        ttk.Button(btn_frame, text="$", width=3, command=self.show_wealth_table).pack(side='right', padx=5, pady=5)

    # #log_turn v1
    def log_turn(self, message):
        self.log_messages.append(message)
        if len(self.log_messages) > 100:
            self.log_messages.pop(0)
        self.clear()
        self.setup_log_box()
        self.setup_player_stats_box()
        # if hasattr(self, 'log_box'):
        #     self.log_box.config(state='normal')
        #     self.log_box.insert('end', message + '\n')
        #     self.log_box.see('end')
        #     self.log_box.config(state='disabled')



    # #log_turn v2
    # def log_turn(self, message):
    #         self.log_messages.append(message)
    #         if len(self.log_messages) > 100:
    #             self.log_messages.pop(0)

    #         wealth_snapshot = [round(p.literacy + p.capital, 2) for p in self.players]
    #         self.wealth_log.append(wealth_snapshot)

    #         self.log_box.config(state='normal')
    #         tag = 'success' if 'changed to' in message and '(-' not in message else 'failure'
    #         self.log_box.insert('end', message + '\n', tag)
    #         self.log_box.see('end')
    #         self.log_box.tag_config('success', foreground='blue')
    #         self.log_box.tag_config('failure', foreground='red')
    #         self.log_box.config(state='disabled')

    def show_wealth_table(self):
        top = tk.Toplevel(self.root)
        top.title("Wealth per Round")

        columns = ["Round #"] + [p.name for p in self.players]
        tree = ttk.Treeview(top, columns=columns, show='headings')
        for col in columns:
            tree.heading(col, text=col)
        tree.pack(fill='both', expand=True)

        for round_index, round_wealth in enumerate(self.wealth_log, 1):
            values = [f"{round_index}"] + round_wealth
            tree.insert('', 'end', values=values)

    def show_diplomacy_matrix(self):
        top = tk.Toplevel(self.root)
        top.title("Diplomacy Matrix")

        header = ["Player"] + [p.name for p in self.players]
        for col, name in enumerate(header):
            ttk.Label(top, text=name, borderwidth=1, relief="solid", width=15).grid(row=0, column=col)

        for i, player_row in enumerate(self.players):
            ttk.Label(top, text=player_row.name + " to", borderwidth=1, relief="solid", width=15).grid(row=i+1, column=0)
            for j, player_col in enumerate(self.players):
                if player_row == player_col:
                    cell_text = "-"
                else:
                    cell_text = f"{player_row.diplomacy.get(player_col.name, 0):.2f}"
                ttk.Label(top, text=cell_text, borderwidth=1, relief="solid", width=15).grid(row=i+1, column=j+1)


    def play_card(self, choice):
        player = self.players[self.current_player_index]
        card = {'I': self.inv_card, 'D': self.dip_card, 'T': self.trd_card}[choice]
        roll = random.randint(1, 12)
        threshold = 12 - math.floor(card.odds * 12)
        result = ""
        
        if choice == 'I':
            old_tech = player.technology
            old_lit = player.literacy
            old_cap = player.capital
            if roll >= threshold:
                inc = card.pay_off / (player.literacy + player.capital)
                player.technology += inc
                player.literacy -= card.pay_off * card.LKRatio
                player.capital -= card.pay_off * (1 - card.LKRatio)
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"{player.name}'s Technology changed to {old_tech:.4f}(+{inc:.4f})={player.technology:.4f}"
                )
            else:
                lit_pen = card.penalty * card.LKRatio
                cap_pen = card.penalty * (1 - card.LKRatio)
                player.literacy -= lit_pen
                player.capital -= cap_pen
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"{player.name}'s Literacy changed to {old_lit:.2f}(-{lit_pen:.2f})={player.literacy:.2f}, "
                    f"Capital changed to {old_cap:.2f}(-{cap_pen:.2f})={player.capital:.2f}"
                )

        elif choice == 'D':
            partner = self.choose_partner(player,"Diplomacy")
            old_dip = player.diplomacy[partner.name]
            if roll >= threshold:
                player.diplomacy[partner.name] += card.pay_off
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"{player.name}'s Diplomacy with {partner.name} changed to "
                    f"{old_dip:.2f}(+{card.pay_off:.2f})={player.diplomacy[partner.name]:.2f}"
                )
            else:
                player.diplomacy[partner.name] -= card.penalty
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"{player.name}'s Diplomacy with {partner.name} changed to "
                    f"{old_dip:.2f}(-{card.penalty:.2f})={player.diplomacy[partner.name]:.2f}"
                )

        elif choice == 'T':
            partner = self.choose_partner(player,"Trade")
            old_lit = player.literacy
            old_cap = player.capital
            if roll >= threshold:
                gain = (card.pay_off * player.technology) + player.diplomacy[partner.name]
                lit_gain = gain * card.LKRatio
                cap_gain = gain * (1 - card.LKRatio)
                player.capital += cap_gain
                player.literacy += lit_gain
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"Capital changed to {old_cap:.2f}(+{cap_gain:.2f})={player.capital:.2f}, "
                    f"Literacy changed to {old_lit:.2f}(+{lit_gain:.2f})={player.literacy:.2f}"
                )
            else:
                loss = card.penalty - player.diplomacy[partner.name]
                lit_loss = loss * card.LKRatio
                cap_loss = loss * (1 - card.LKRatio)
                player.capital -= cap_loss
                player.literacy -= lit_loss
                result = (
                    f"[{player.name}] Rolled {roll}, needed {threshold}. "
                    f"Capital changed to {old_cap:.2f}(-{cap_loss:.2f})={player.capital:.2f}, "
                    f"Literacy changed to {old_lit:.2f}(-{lit_loss:.2f})={player.literacy:.2f}"
                )


        # messagebox.showinfo("Turn Result", f"Roll: {roll} (Target ≥ {threshold})\n{result}")
        self.log_turn(result)
        self.current_player_index += 1
        self.next_turn()

    def clear(self):
        for widget in self.root.winfo_children():
            widget.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = GameGUI(root)
    root.mainloop()
