/* ==========================================================================
   Menu data, captured from the live Grub24 pages on 5 Nov 2026.
   Real build: this lives in Firestore and Eli edits it from the staff dashboard.

   Row shape: [category, name, description, price, options]
     price    number, or { gg: n, edgware: n }, or null (needs a choice first)
     options  b: branches that sell it (default both)
              u: branches where it is unavailable today
              f: price is a "from" price (true, or list of branches)
              x: needs choices before it can be added (size, halves, toppings)
              tag: small label, e.g. "15% off"
              note: replaces the price, e.g. "Delivery only"
              d: per-branch description override
   ========================================================================== */
const CATEGORIES = [
  ['deals', 'Special offers'],
  ['starters', 'Starters'],
  ['poppers', 'Dough balls and poppers'],
  ['pizza', 'Pizza'],
  ['half', 'Half and half'],
  ['salad', 'Salad'],
  ['fish', 'Fish and chips'],
  ['chips', 'Chips'],
  ['dips', 'Dips'],
  ['ice', 'Ice cream'],
  ['drinks', 'Drinks'],
  ['party', 'Party menu']
];

const MENU = [
  // Special offers
  ['deals', 'Party deal', '15% off when you order 6 large pizzas, for collection or delivery. Free dips are not included.', null, { x: true, tag: '15% off' }],
  ['deals', 'Family pizza deal', 'Any 2 large pizzas and any 2 sides.', 42.99],
  ['deals', 'Medium double deal', 'Any 2 medium pizzas and any 2 chips.', 32.99],
  ['deals', 'Kids combo', 'A personal pizza, small chips and a juice box.', 8.50],
  ['deals', 'Ultimate combo', 'Any medium pizza, any sides and a drink.', 18.99, { d: { edgware: 'Any medium pizza, a salad and a drink.' } }],
  ['deals', 'Tuesday deal', 'Buy one, get one free pizza. Collection orders only.', 10.99, { b: ['edgware'], tag: 'Tuesdays' }],
  ['deals', 'Tuesday half price', 'Buy one, get one half price on 10, 12 or 14 inch pizzas. Delivery orders only.', null, { b: ['edgware'], x: true, tag: 'Tuesdays' }],

  // Starters
  ['starters', 'Garlic bread stick (dairy)', '', 3.50],
  ['starters', 'Onion rings', '', 6.50],
  ['starters', 'Cheesy garlic bread', 'A 7 inch base with garlic butter, topped with classic mozzarella.', 8.99],
  ['starters', 'Mac and cheese bites', 'Deep-fried macaroni cheese bites in golden breadcrumbs.', 8.99],
  ['starters', 'Sweet potato bites', '', 8.99, { b: ['edgware'] }],
  ['starters', 'Mozzarella sticks', 'Deep-fried mozzarella in a light batter.', 8.99],
  ['starters', 'Crispy cauliflower', 'Cauliflower in breadcrumbs, fried until crisp.', 8.99],
  ['starters', 'Kiddie pasta', 'Tomato sauce and cheese, baked in the oven.', 8.99, { u: ['gg'] }],

  // Dough balls and poppers
  ['poppers', 'Cheesy garlic poppers', 'Dough balls filled with garlic butter and cheese.', 8.99],
  ['poppers', 'Spicy jalapeño poppers', 'Dough balls filled with jalapeño, cheese and pizza sauce.', 8.99],
  ['poppers', 'Mushroom and cheese poppers', 'Dough balls filled with mushroom, cheese and pizza sauce.', 8.99],
  ['poppers', 'Create your own poppers', 'Pick your own fillings.', 8.99, { x: true }],

  // Pizza
  ['pizza', 'Margherita', 'Classic mozzarella and tomato sauce.', { gg: 6.50 }, { f: true, x: true, d: { edgware: 'Classic mozzarella and tomato sauce.' }, note_b: { edgware: 'Delivery only' } }],
  ['pizza', 'Margherita with 5 free toppings', 'Topped with 100% mozzarella and five toppings of your choice.', { gg: 6.50, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'The American', 'Green olives, mushroom and red onion.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Hawaiian', 'Onion, pineapple and sweetcorn.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Californian', 'Feta, sundried tomatoes and red onion.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Florentine', 'Egg, cherry tomatoes, onion and oregano.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'New York deli', 'Aubergine, fried onions, courgette and baby corn, topped with pesto.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'The Volcano', 'Jalapeño, mushroom, onion, black olives and peppers.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Gourmet', 'Tomato and garlic sauce, mushroom, onion, pepper and oregano.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Quattro fromage', 'Margherita with cheddar, mozzarella, camembert and parmesan.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Eli’s garden', 'Green olives, mushroom, onion, pepper and sweetcorn.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Pulled Chicago', 'Vegetarian sausage, cherry tomatoes, fried onions and vegetarian pulled beef.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Spicy spinach', 'Parmesan and cream sauce, mozzarella, spicy sautéed spinach and sundried tomatoes.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true, u: ['gg'] }],
  ['pizza', 'The pumpkin', 'Roasted pumpkin and cream sauce, mozzarella, mushrooms and parmesan.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true, u: ['gg'] }],
  ['pizza', 'Mediterranean melt', 'Mozzarella, tomato sauce, crispy fried aubergine and feta.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Pesto bliss', 'Pesto sauce, mozzarella, semi-dried tomatoes, chopped black olives and creamy cheese.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],
  ['pizza', 'Ricotta royale', 'Parmesan cream sauce, mozzarella, ricotta, sautéed leeks, sundried tomatoes and chopped black olives.', { gg: 6.99, edgware: 5.99 }, { f: true, x: true }],

  // Half and half
  ['half', 'Half and half, 10 inch', 'Pick two pizzas, one on each half.', null, { x: true }],
  ['half', 'Half and half, 12 inch', 'Pick two pizzas, one on each half.', null, { x: true }],
  ['half', 'Half and half, 14 inch', 'Pick two pizzas, one on each half.', null, { x: true }],

  // Salad and fish (Edgware only)
  ['salad', 'Pick and mix salad', 'Build your own. Comes with a garlic bread stick.', null, { b: ['edgware'], x: true, u: ['edgware'] }],
  ['fish', 'Kids fish and chips', '', 9.50, { b: ['edgware'] }],
  ['fish', 'Fish and chips', '', 17.99, { b: ['edgware'] }],

  // Chips
  ['chips', 'Kids chips', '', 2.90],
  ['chips', 'Original chips', '', 5.80],
  ['chips', 'Pesto chips', '', 5.80, { u: ['gg'] }],
  ['chips', 'Salt and vinegar chips', '', 5.80],
  ['chips', 'Cheesy chips', '', 5.80],
  ['chips', 'Sweet chilli chips', '', 5.80, { u: ['gg'] }],
  ['chips', 'Piri piri chips', '', 5.80],
  ['chips', 'Garlic chips', '', 5.80],
  ['chips', 'Spicy chips', '', 5.99],

  // Dips, ice cream, drinks
  ['dips', 'Sweet chilli dip', '', 0.50, { u: ['gg'] }],
  ['dips', 'Garlic dip', '', 0.50],
  ['dips', 'Spicy tomato dip', '', 0.50],
  ['ice', 'Ice cream', '90ml tub.', 2.50],
  ['drinks', 'Coca-Cola', '', 1.95, { f: ['gg'], x: ['gg'] }],
  ['drinks', 'Diet Coke', '', 1.95, { f: ['gg'], x: ['gg'] }],
  ['drinks', 'Fanta', '', 1.95],
  ['drinks', 'Sprite', '', 1.95],
  ['drinks', 'Mango juice', '', 1.95, { u: ['gg'] }],
  ['drinks', 'Apple juice', '', 1.95, { u: ['gg'] }],
  ['drinks', 'Strawberry and banana juice', '', 1.95, { u: ['gg'] }],
  ['drinks', 'Peach juice', '', 1.95, { u: ['gg'] }],
  ['drinks', 'Still water', '', 1.95],
  ['drinks', 'Sparkling water', '', 1.95, { u: ['gg'] }],

  // Party menu
  ['party', 'Pizza dough balls', '48 pieces.', 32.00],
  ['party', 'Veg platter sticks', 'Cucumber, carrot and pepper sticks. Serves 10 kids.', 28.99],
  ['party', 'The fish box', '20 pieces. Serves 10 kids.', 52.50],
  ['party', 'Chips box', 'Serves 10 kids.', 25.99],
  ['party', 'Ice cream', '10 mini tubs.', 16.99]
];
