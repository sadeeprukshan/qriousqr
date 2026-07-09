update products set coupon_category = 'main_course'
  where name_en in ('Mixed Grill','Shish Taouk','Chicken Shawarma','Beef Shawarma')
    and company_id in (select id from companies where slug = 'kantami');
update products set coupon_category = 'dessert'
  where name_en in ('Baklava','Knafeh')
    and company_id in (select id from companies where slug = 'kantami');
update products set coupon_category = 'beverage'
  where name_en in ('Fresh Lemonade','Arabic Coffee')
    and company_id in (select id from companies where slug = 'kantami');
