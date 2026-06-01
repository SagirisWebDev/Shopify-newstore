"""
Generate Common Roast v1 product catalog CSV for Shopify import.

Products: 6 single-origins, 2 blends, 1 decaf, 3 gift card denominations.
Variants per coffee: Size (250g / 1kg) × Grind (Whole Bean / Coarse / Medium / Fine / Espresso)
= 10 variants per coffee product.
"""

import csv
import sys

VENDOR = "Common Roast"
COFFEE_CATEGORY = "Food, Beverages & Tobacco > Beverages > Coffee & Tea > Coffee"
GIFT_CARD_CATEGORY = "Gift Cards"

GRINDS = ["Whole Bean", "Coarse", "Medium", "Fine", "Espresso"]
SIZES = [
    {"label": "250g", "price_factor": 1.0, "weight_g": 350, "unit_measure": "250"},
    {"label": "1kg",  "price_factor": 1.0, "weight_g": 1150, "unit_measure": "1000"},
]

COFFEES = [
    {
        "title": "Ethiopia Yirgacheffe Natural",
        "handle": "ethiopia-yirgacheffe-natural",
        "description": (
            "Grown at high altitude in the birthplace of coffee, this natural-process Yirgacheffe "
            "is picked and dried whole on raised beds under the Ethiopian sun. The result is a wildly "
            "expressive cup — juicy, almost wine-like, with blueberry and jasmine up front and a long "
            "dark-chocolate finish. Light roast. Best within 21 days of roast."
        ),
        "tags": "single-origin,ethiopia,light-roast,natural-process,yirgacheffe",
        "price_250": 22.00,
        "price_1kg": 70.00,
        "sku_prefix": "CR-ETH-YRG",
        "seo_title": "Ethiopia Yirgacheffe Natural — Common Roast",
        "seo_desc": (
            "Natural-process Ethiopian single-origin with blueberry, jasmine, and dark chocolate. "
            "Light roast. Ships fresh within days of roast."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "Colombia Huila Washed",
        "handle": "colombia-huila-washed",
        "description": (
            "From smallholder farms in the high valleys of Huila, Colombia's most celebrated growing "
            "region. Fully washed and carefully dried, this is a classic, approachable cup that works "
            "equally well as a pour-over or a flat white. Caramel sweetness, crisp red apple, and a "
            "clean almond finish. Medium roast."
        ),
        "tags": "single-origin,colombia,medium-roast,washed,huila",
        "price_250": 20.00,
        "price_1kg": 64.00,
        "sku_prefix": "CR-COL-HUI",
        "seo_title": "Colombia Huila Washed — Common Roast",
        "seo_desc": (
            "Washed Colombian single-origin from Huila with caramel, red apple, and almond. "
            "Medium roast. Fresh-roasted and shipped to order."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "Guatemala Antigua Honey",
        "handle": "guatemala-antigua-honey",
        "description": (
            "Processed using the honey method — pulped but not fully washed, so the sticky fruit "
            "mucilage dries on the bean — this Antigua delivers the clarity of a washed coffee with "
            "the added sweetness of a natural. Brown sugar, sun-ripened peach, and creamy milk "
            "chocolate. Medium roast. A crowd-pleaser."
        ),
        "tags": "single-origin,guatemala,medium-roast,honey-process,antigua",
        "price_250": 19.00,
        "price_1kg": 60.00,
        "sku_prefix": "CR-GUA-ANT",
        "seo_title": "Guatemala Antigua Honey — Common Roast",
        "seo_desc": (
            "Honey-process Guatemalan single-origin with brown sugar, peach, and milk chocolate. "
            "Medium roast. Approachable and sweet."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "Kenya Nyeri AA Washed",
        "handle": "kenya-nyeri-aa-washed",
        "description": (
            "Kenya AA from the high slopes around Nyeri, processed through a traditional double-wash "
            "that amplifies the region's signature brightness. Expect an assertive, wine-like cup: "
            "blackcurrant and grapefruit on the nose, black tea body, and a long, clean finish. "
            "Light-medium roast. Not for the faint-hearted."
        ),
        "tags": "single-origin,kenya,light-roast,washed,nyeri,AA",
        "price_250": 22.00,
        "price_1kg": 70.00,
        "sku_prefix": "CR-KEN-NYR",
        "seo_title": "Kenya Nyeri AA Washed — Common Roast",
        "seo_desc": (
            "Washed Kenyan AA from Nyeri with blackcurrant, grapefruit, and black tea. "
            "Light-medium roast. Bright and complex."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "Brazil Cerrado Natural",
        "handle": "brazil-cerrado-natural",
        "description": (
            "Produced on large farms in the Cerrado Mineiro plateau — Brazil's most consistent "
            "growing region. Natural-process, sun-dried for weeks until the cherry is raisin-dark. "
            "The cup is heavy-bodied and low-acid: dark chocolate, walnut, and a lingering brown "
            "sugar sweetness. Medium-dark roast. Excellent as espresso."
        ),
        "tags": "single-origin,brazil,medium-dark-roast,natural-process,cerrado,espresso",
        "price_250": 18.00,
        "price_1kg": 56.00,
        "sku_prefix": "CR-BRA-CER",
        "seo_title": "Brazil Cerrado Natural — Common Roast",
        "seo_desc": (
            "Natural-process Brazilian single-origin from Cerrado with dark chocolate, walnut, "
            "and brown sugar. Medium-dark roast. Excellent as espresso."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "Peru Cajamarca Washed",
        "handle": "peru-cajamarca-washed",
        "description": (
            "From indigenous smallholder cooperatives in the Cajamarca highlands, grown in the shade "
            "of native trees. Certified organic. This gentle, sweet coffee drinks effortlessly: "
            "floral honey, soft citrus, and a hazlenut finish. Light-medium roast. A great "
            "introduction to Peruvian specialty."
        ),
        "tags": "single-origin,peru,light-roast,washed,cajamarca,organic",
        "price_250": 19.00,
        "price_1kg": 60.00,
        "sku_prefix": "CR-PER-CAJ",
        "seo_title": "Peru Cajamarca Washed — Common Roast",
        "seo_desc": (
            "Washed Peruvian single-origin from Cajamarca with honey, citrus, and hazelnut. "
            "Light-medium roast. Organic, shade-grown."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    # --- Blends ---
    {
        "title": "Morning Ritual",
        "handle": "morning-ritual",
        "description": (
            "Our house blend, built for the first cup of the day. Anchored by a Brazil natural for "
            "body and sweetness, with a Colombian washed component for brightness and clarity. "
            "Approachable, consistent, and satisfying whether you're brewing a pour-over at 6am or "
            "pulling a flat white. Milk chocolate, caramel, toasted almond. Medium roast."
        ),
        "tags": "blend,medium-roast,house-blend,everyday,espresso",
        "price_250": 17.00,
        "price_1kg": 54.00,
        "sku_prefix": "CR-BLD-MOR",
        "seo_title": "Morning Ritual House Blend — Common Roast",
        "seo_desc": (
            "Common Roast house blend with milk chocolate, caramel, and toasted almond. "
            "Medium roast. Delicious as pour-over or espresso."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    {
        "title": "After Dark",
        "handle": "after-dark",
        "description": (
            "A bold espresso blend for those who prefer their coffee serious. Heavy on a dark-roasted "
            "Brazilian natural, cut with a small percentage of washed Guatemalan for just enough "
            "structure. The result cuts through milk without disappearing: dark chocolate, brown sugar, "
            "and a subtle smoky cedar note in the finish. Dark roast. Designed for espresso — "
            "works well with milk."
        ),
        "tags": "blend,dark-roast,espresso-blend,milk-coffee",
        "price_250": 17.00,
        "price_1kg": 54.00,
        "sku_prefix": "CR-BLD-ADK",
        "seo_title": "After Dark Espresso Blend — Common Roast",
        "seo_desc": (
            "Bold dark-roast espresso blend with dark chocolate, brown sugar, and smoky cedar. "
            "Cuts beautifully through milk."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
    # --- Decaf ---
    {
        "title": "Swiss Water Decaf Colombia",
        "handle": "swiss-water-decaf-colombia",
        "description": (
            "Decaffeinated using the Swiss Water Process — no chemicals, just water, time, and a "
            "carbon filter that strips caffeine while leaving the good stuff behind. This Colombian "
            "single-origin drinks far better than it has any right to: toffee sweetness, a hint of "
            "dried cherry, and a clean cocoa finish. Medium roast. Indistinguishable from fully "
            "caffeinated in a blind tasting."
        ),
        "tags": "decaf,colombia,medium-roast,swiss-water,single-origin",
        "price_250": 20.00,
        "price_1kg": 64.00,
        "sku_prefix": "CR-DEC-COL",
        "seo_title": "Swiss Water Decaf Colombia — Common Roast",
        "seo_desc": (
            "Swiss Water Process decaf Colombian single-origin with toffee, dried cherry, and cocoa. "
            "Medium roast. No chemicals, no compromise."
        ),
        "gs_category": COFFEE_CATEGORY,
    },
]

GIFT_CARDS = [
    {"amount": 25,  "sku": "CR-GC-025"},
    {"amount": 50,  "sku": "CR-GC-050"},
    {"amount": 100, "sku": "CR-GC-100"},
]

HEADER = [
    "Title", "URL handle", "Description", "Vendor", "Product category", "Type", "Tags",
    "Published on online store", "Status", "SKU", "Barcode",
    "Option1 name", "Option1 value", "Option1 Linked To",
    "Option2 name", "Option2 value", "Option2 Linked To",
    "Option3 name", "Option3 value", "Option3 Linked To",
    "Price", "Compare-at price", "Cost per item", "Charge tax", "Tax code",
    "Unit price total measure", "Unit price total measure unit",
    "Unit price base measure", "Unit price base measure unit",
    "Inventory tracker", "Inventory quantity", "Continue selling when out of stock",
    "Weight value (grams)", "Weight unit for display", "Requires shipping", "Fulfillment service",
    "Product image URL", "Image position", "Image alt text", "Variant image URL",
    "Gift card", "SEO title", "SEO description",
    "Color (product.metafields.shopify.color-pattern)",
    "Google Shopping / Google product category", "Google Shopping / Gender",
    "Google Shopping / Age group", "Google Shopping / Manufacturer part number (MPN)",
    "Google Shopping / Ad group name", "Google Shopping / Ads labels",
    "Google Shopping / Condition", "Google Shopping / Custom product",
    "Google Shopping / Custom label 0", "Google Shopping / Custom label 1",
    "Google Shopping / Custom label 2", "Google Shopping / Custom label 3",
    "Google Shopping / Custom label 4",
]

def empty_row(handle):
    row = [""] * len(HEADER)
    row[1] = handle  # URL handle
    return row

def coffee_rows(product):
    rows = []
    first = True

    prices = {
        "250g": product["price_250"],
        "1kg":  product["price_1kg"],
    }
    unit_measures = {"250g": "250", "1kg": "1000"}
    weights = {"250g": 350, "1kg": 1150}

    for size_idx, size in enumerate(["250g", "1kg"]):
        for grind in GRINDS:
            grind_code = grind.replace(" ", "").upper()[:3]
            size_code = size.replace("g", "G").replace("k", "K")
            sku = f"{product['sku_prefix']}-{size_code}-{grind_code}"

            if first:
                row = [""] * len(HEADER)
                row[0]  = product["title"]
                row[1]  = product["handle"]
                row[2]  = product["description"]
                row[3]  = VENDOR
                row[4]  = COFFEE_CATEGORY
                row[5]  = "Coffee"
                row[6]  = product["tags"]
                row[7]  = "TRUE"
                row[8]  = "active"
                row[9]  = sku
                row[10] = ""
                row[11] = "Size"
                row[12] = size
                row[13] = ""
                row[14] = "Grind"
                row[15] = grind
                row[16] = ""
                row[17] = ""
                row[18] = ""
                row[19] = ""
                row[20] = f"{prices[size]:.2f}"
                row[21] = ""
                row[22] = ""
                row[23] = "TRUE"
                row[24] = ""
                row[25] = unit_measures[size]
                row[26] = "g"
                row[27] = "100"
                row[28] = "g"
                row[29] = "shopify"
                row[30] = "20"
                row[31] = "DENY"
                row[32] = str(weights[size])
                row[33] = "g"
                row[34] = "TRUE"
                row[35] = "manual"
                row[36] = ""   # Product image URL — placeholder
                row[37] = "1"
                row[38] = product["title"]
                row[39] = ""
                row[40] = "FALSE"
                row[41] = product["seo_title"]
                row[42] = product["seo_desc"]
                row[43] = ""
                row[44] = product["gs_category"]
                row[45] = ""
                row[46] = ""
                row[47] = ""
                row[48] = ""
                row[49] = ""
                row[50] = "new"
                row[51] = "FALSE"
                row[52] = ""
                row[53] = ""
                row[54] = ""
                row[55] = ""
                row[56] = ""
                first = False
            else:
                row = empty_row(product["handle"])
                row[9]  = sku
                row[11] = "Size"
                row[12] = size
                row[14] = "Grind"
                row[15] = grind
                row[20] = f"{prices[size]:.2f}"
                row[25] = unit_measures[size]
                row[26] = "g"
                row[27] = "100"
                row[28] = "g"
                row[29] = "shopify"
                row[30] = "20"
                row[31] = "DENY"
                row[32] = str(weights[size])
                row[33] = "g"
                row[34] = "TRUE"
                row[35] = "manual"

            rows.append(row)

    return rows


def gift_card_rows():
    rows = []
    handle = "common-roast-gift-card"
    first = True

    for gc in GIFT_CARDS:
        amount = gc["amount"]
        sku = gc["sku"]
        title = "Common Roast Gift Card"
        desc = (
            "Give the gift of great coffee. Common Roast gift cards are delivered digitally "
            "and never expire. The recipient can spend it on any coffee, any size, any roast."
        )

        if first:
            row = [""] * len(HEADER)
            row[0]  = title
            row[1]  = handle
            row[2]  = desc
            row[3]  = VENDOR
            row[4]  = GIFT_CARD_CATEGORY
            row[5]  = "Gift Card"
            row[6]  = "gift-card,digital"
            row[7]  = "TRUE"
            row[8]  = "active"
            row[9]  = sku
            row[10] = ""
            row[11] = "Denomination"
            row[12] = f"${amount}"
            row[13] = ""
            row[14] = ""
            row[15] = ""
            row[16] = ""
            row[17] = ""
            row[18] = ""
            row[19] = ""
            row[20] = f"{amount:.2f}"
            row[21] = ""
            row[22] = ""
            row[23] = "FALSE"
            row[24] = ""
            row[25] = ""
            row[26] = ""
            row[27] = ""
            row[28] = ""
            row[29] = ""
            row[30] = "100"
            row[31] = "CONTINUE"
            row[32] = "0"
            row[33] = "g"
            row[34] = "FALSE"
            row[35] = "manual"
            row[36] = ""
            row[37] = "1"
            row[38] = title
            row[39] = ""
            row[40] = "TRUE"
            row[41] = f"${amount} Common Roast Gift Card"
            row[42] = f"Give the gift of great coffee with a ${amount} Common Roast gift card. Digital delivery. Never expires."
            row[43] = ""
            row[44] = ""
            row[45] = ""
            row[46] = ""
            row[47] = ""
            row[48] = ""
            row[49] = ""
            row[50] = ""
            row[51] = ""
            row[52] = ""
            row[53] = ""
            row[54] = ""
            row[55] = ""
            row[56] = ""
            first = False
        else:
            row = empty_row(handle)
            row[9]  = sku
            row[11] = "Denomination"
            row[12] = f"${amount}"
            row[20] = f"{amount:.2f}"
            row[30] = "100"
            row[31] = "CONTINUE"
            row[32] = "0"
            row[33] = "g"
            row[34] = "FALSE"
            row[35] = "manual"
            row[40] = "TRUE"

        rows.append(row)

    return rows


def main():
    out_path = "data/common-roast-products.csv"
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(HEADER)

        for product in COFFEES:
            for row in coffee_rows(product):
                writer.writerow(row)

        for row in gift_card_rows():
            writer.writerow(row)

    print(f"Written to {out_path}")
    print(f"Products: {len(COFFEES)} coffees + 1 gift card (3 denominations)")
    print(f"Coffee variants per product: {len(SIZES) * len(GRINDS)} ({len(SIZES)} sizes × {len(GRINDS)} grinds)")


if __name__ == "__main__":
    main()
