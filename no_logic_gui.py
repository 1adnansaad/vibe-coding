import tkinter as tk
from tkinter import ttk, messagebox

settings = {
    "starting_literacy": 50,
    "starting_capital": 50,
    "investment_range": (1, 10, 0, 7),
    "diplomacy_range": (1, 10, 0, 7),
    "trade_range": (1, 10, 0, 7)
}

class GameGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Card Game")

        self.main_menu()

    def main_menu(self):
        self.clear()
        ttk.Label(self.root, text="Main Menu", font=("Arial", 18)).pack(pady=10)
        ttk.Button(self.root, text="Settings", command=self.settings_menu).pack(pady=5)
        ttk.Button(self.root, text="New Game", command=self.new_game).pack(pady=5)
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

    def new_game(self):
        self.clear()
        ttk.Label(self.root, text="Game Starting...", font=("Arial", 16)).pack(pady=20)
        ttk.Button(self.root, text="Back to Menu", command=self.main_menu).pack(pady=10)

    def clear(self):
        for widget in self.root.winfo_children():
            widget.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = GameGUI(root)
    root.mainloop()
