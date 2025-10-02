# Database Schema Documentation

## E-commerce Platform for Electronics and Home Appliances

This database is designed to support an e-commerce website specializing in electronics and home appliances. It stores information about products, categories, brands, and frequently asked questions (FAQs) to provide a comprehensive and user-friendly online shopping experience.

### **Products**
*Purpose*: This table holds detailed information about each product available for sale.

| Field | Type | Description |
| :--- | :--- | :--- |
| `product_name` | VARCHAR(255) | The full name of the product, including model or key features. |
| `description` | TEXT | A detailed description of the product's features and practical implications. |
| `category_id` | VARCHAR (255) | The identifier for the product's category |
| `brand_id` | VARCHAR (255) | The identifier for the product's brand |

*Relationship*:
- This table has a many-to-one relationship with the `category_id`.
- This table has a many-to-one relationship with the `brand_id`.

---

### **FAQs**
*Purpose*: This table stores frequently asked questions and their corresponding answers to assist customers with common queries.

| Field | Type | Description |
| :--- | :--- | :--- |
| `question` | TEXT | The text of the frequently asked question. |
| `answer` | TEXT | The detailed answer to the question. |
| `topic` | VARCHAR(255)| The topic or category of the FAQ (e.g., "Ordering & Account", "Payments"). |

*Relationship*:
- This table is independent and does not have direct foreign key relationships with the other tables in this schema, though the `topic` field provides a logical grouping for the FAQs.