import random
import os
import math

# ==========================
# Game Settings
# ==========================
settings = {
    "starting_literacy": 50,
    "starting_capital": 50,
    "investment_range": (1, 10, 0, 7),  # pay_low, pay_high, pen_low, pen_high
    "diplomacy_range": (1, 10, 0, 7),
    "trade_range": (1, 10, 0, 7)
}

# ==========================
# Player class
# ==========================
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

    def display_stats(self):
        print(f"Player: {self.name}")
        print(f"  Literacy: {self.literacy}")
        print(f"  Technology: {self.technology:.4f}")
        print(f"  Capital: {self.capital}")
        print(f"  Diplomacy: {self.diplomacy}")
        print("-" * 40)

# ==========================
# Card Classes
# ==========================
class TradeCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["trade_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))
        self.LKRatio = random.uniform(0, 1)

    def display_card(self):
        print(f"TradeCard ID: {self.deets}")
        print(f"  Pay-off: {self.pay_off:.2f}")
        print(f"  Penalty: {self.penalty:.2f}")
        print(f"  Odds: {self.odds:.4f}")
        print(f"  LKRatio: {self.LKRatio:.2f}")
        print("-" * 40)

class InvestmentCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["investment_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))
        self.LKRatio = random.uniform(0, 1)

    def display_card(self):
        print(f"InvestmentCard ID: {self.deets}")
        print(f"  Pay-off: {self.pay_off:.2f}")
        print(f"  Penalty: {self.penalty:.2f}")
        print(f"  Odds: {self.odds:.4f}")
        print(f"  LKRatio: {self.LKRatio:.2f}")
        print("-" * 40)

class DiplomacyCard:
    def __init__(self):
        p_low, p_high, n_low, n_high = settings["diplomacy_range"]
        self.deets = random.randint(1000, 9999)
        self.pay_off = random.uniform(p_low, p_high)
        self.penalty = random.uniform(n_low, n_high)
        self.odds = 1 - (self.pay_off / (self.penalty + self.pay_off))

    def display_card(self):
        print(f"DiplomacyCard ID: {self.deets}")
        print(f"  Pay-off: {self.pay_off:.2f}")
        print(f"  Penalty: {self.penalty:.2f}")
        print(f"  Odds: {self.odds:.4f}")
        print("-" * 40)

# ==========================
# Menu and Utility Functions
# ==========================
def clear_screen():
    os.system('cls' if os.name == 'nt' else 'clear')

def choose_other_player(current_player, players):
    available = [p for p in players if p.name != current_player.name]
    while True:
        print("Choose a player:")
        for i, p in enumerate(available):
            print(f"{i + 1}. {p.name}")
        try:
            idx = int(input("Enter number: ")) - 1
            if 0 <= idx < len(available):
                return available[idx]
        except ValueError:
            pass
        print("Invalid input. Try again.")

def show_settings_menu():
    print("\n--- Game Settings ---")
    try:
        settings["starting_literacy"] = int(input("Starting Literacy (default 50): ") or 50)
        settings["starting_capital"] = int(input("Starting Capital (default 50): ") or 50)

        def get_range(name, default):
            print(f"{name} Range (default {default}):")
            pay_low = float(input("  Payoff Low: ") or default[0])
            pay_high = float(input("  Payoff High: ") or default[1])
            pen_low = float(input("  Penalty Low: ") or default[2])
            pen_high = float(input("  Penalty High: ") or default[3])
            return (pay_low, pay_high, pen_low, pen_high)

        settings["investment_range"] = get_range("Investment", (1, 10, 0, 7))
        settings["diplomacy_range"] = get_range("Diplomacy", (1, 10, 0, 7))
        settings["trade_range"] = get_range("Trade", (1, 10, 0, 7))
    except ValueError:
        print("Invalid input. Keeping default values.")

# ==========================
# Main game loop
# ==========================
def main_game():
    clear_screen()

    try:
        n = int(input("Enter number of players: "))
        if n < 2:
            print("There must be at least 2 players.")
            return
    except ValueError:
        print("Invalid number.")
        return

    players = []
    for i in range(n):
        name = input(f"Enter name for Player {i+1}: ")
        players.append(Player(name))

    try:
        num_cards = int(input("Enter number of cards for each type: "))
    except ValueError:
        print("Invalid number.")
        return

    tradecards = [TradeCard() for _ in range(num_cards)]
    investmentcards = [InvestmentCard() for _ in range(num_cards)]
    diplomacycards = [DiplomacyCard() for _ in range(num_cards)]

    for player in players:
        player.assign_diplomacy(players)

    round_counter = 1

    while True:
        print(f"\n========== ROUND {round_counter} ==========")

        for player in players:
            inv_card = random.choice(investmentcards)
            dip_card = random.choice(diplomacycards)
            trd_card = random.choice(tradecards)

            print("\nAvailable Cards:")
            print("Investment Card:")
            inv_card.display_card()
            print("Diplomacy Card:")
            dip_card.display_card()
            print("Trade Card:")
            trd_card.display_card()

            while True:
                choice = input(f"{player.name}, choose (I)nvest, (D)iplomacy, (T)rade or Q to quit: ").upper()
                if choice in ['I', 'D', 'T', 'Q']:
                    break
                print("Invalid choice.")

            if choice == 'Q':
                print("Game ended by user.")
                return

            if choice == 'I':
                card = inv_card
                rollHash = random.randint(1, 12)
                threshold = 12 - math.floor(card.odds * 12)
                print(f"{player.name}'s roll: {rollHash} (Target ≥ {threshold})")
                if rollHash >= threshold:
                    increase = card.pay_off / (player.literacy + player.capital)
                    player.technology += increase
                    player.literacy -= card.pay_off * card.LKRatio
                    player.capital -= card.pay_off * (1 - card.LKRatio)
                    print(f"✅ {player.name}'s Technology increased by {increase:.4f}, Literacy and Capital reduced based on LKRatio")
                else:
                    player.literacy -= card.penalty * card.LKRatio
                    player.capital -= card.penalty * (1 - card.LKRatio)
                    print(f"❌ {player.name} failed. Literacy and Capital reduced based on penalty and LKRatio")

            elif choice == 'D':
                card = dip_card
                partner = choose_other_player(player, players)
                rollHash = random.randint(1, 12)
                threshold = 12 - math.floor(card.odds * 12)
                print(f"{player.name}'s roll: {rollHash} (Target ≥ {threshold})")
                if rollHash >= threshold:
                    player.diplomacy[partner.name] += card.pay_off
                    print(f"✅ {player.name}'s Diplomacy with {partner.name} increased by {card.pay_off:.2f}")
                else:
                    player.diplomacy[partner.name] -= card.penalty
                    print(f"❌ {player.name}'s Diplomacy with {partner.name} decreased by {card.penalty:.2f}")

            elif choice == 'T':
                card = trd_card
                partner = choose_other_player(player, players)
                rollHash = random.randint(1, 12)
                threshold = 12 - math.floor(card.odds * 12)
                print(f"{player.name}'s roll: {rollHash} (Target ≥ {threshold})")
                if rollHash >= threshold:
                    gain = (card.pay_off * player.technology) + player.diplomacy[partner.name]
                    player.capital += gain * (1 - card.LKRatio)
                    player.literacy += gain * card.LKRatio
                    print(f"✅ {player.name}'s Capital and Literacy increased based on LKRatio")
                else:
                    loss = card.penalty - player.diplomacy[partner.name]
                    player.capital -= loss * (1 - card.LKRatio)
                    player.literacy -= loss * card.LKRatio
                    print(f"❌ {player.name}'s Capital and Literacy decreased based on LKRatio")

        print("\n--- Player Stats After Round ---")
        for player in players:
            player.display_stats()

        round_counter += 1


def main_menu():
    while True:
        clear_screen()
        print("Welcome to the Game")
        print("1. Settings")
        print("2. New Game")
        print("3. Quit")
        choice = input("Choose an option: ")
        if choice == '1':
            show_settings_menu()
        elif choice == '2':
            main_game()
        elif choice == '3':
            break

# ==========================
# Start game
# ==========================
if __name__ == "__main__":
    main_menu()
