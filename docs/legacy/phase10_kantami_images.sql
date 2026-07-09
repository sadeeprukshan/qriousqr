-- Categories
update categories set image_url = '/seed-images/kantami/categories/mezze.webp'
  where name_en = 'Mezze' and company_id in (select id from companies where slug='kantami');
update categories set image_url = '/seed-images/kantami/categories/shawarma.webp'
  where name_en = 'Shawarma' and company_id in (select id from companies where slug='kantami');
update categories set image_url = '/seed-images/kantami/categories/grills.webp'
  where name_en = 'Grills' and company_id in (select id from companies where slug='kantami');
update categories set image_url = '/seed-images/kantami/categories/salads.webp'
  where name_en = 'Salads' and company_id in (select id from companies where slug='kantami');
update categories set image_url = '/seed-images/kantami/categories/desserts.webp'
  where name_en = 'Desserts' and company_id in (select id from companies where slug='kantami');
update categories set image_url = '/seed-images/kantami/categories/beverages.webp'
  where name_en = 'Beverages' and company_id in (select id from companies where slug='kantami');

-- Products
update products set image_url = '/seed-images/kantami/products/hummus.webp'         where name_en = 'Hummus'           and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/tabbouleh.webp'      where name_en = 'Tabbouleh'        and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/falafel.webp'        where name_en = 'Falafel'          and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/chicken-shawarma.webp' where name_en = 'Chicken Shawarma' and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/beef-shawarma.webp'    where name_en = 'Beef Shawarma'    and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/mixed-grill.webp'      where name_en = 'Mixed Grill'      and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/shish-taouk.webp'      where name_en = 'Shish Taouk'      and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/fattoush.webp'         where name_en = 'Fattoush'         and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/baklava.webp'          where name_en = 'Baklava'          and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/knafeh.webp'           where name_en = 'Knafeh'           and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/fresh-lemonade.webp'   where name_en = 'Fresh Lemonade'   and company_id in (select id from companies where slug='kantami');
update products set image_url = '/seed-images/kantami/products/arabic-coffee.webp'    where name_en = 'Arabic Coffee'    and company_id in (select id from companies where slug='kantami');

-- Companies
update companies set
  cover_url = '/seed-images/kantami/cover.webp',
  logo_url  = '/seed-images/kantami/logo.webp'
where slug = 'kantami';
