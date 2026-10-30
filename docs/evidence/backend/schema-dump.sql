--
-- PostgreSQL database dump
--

\restrict v5ZYtj2EaSXG7dOIxEIlx3IOjxfSIryo34z5UN6AOdfQQFxNp3kS3bNQpkczbwF

-- Dumped from database version 16.15
-- Dumped by pg_dump version 16.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


--
-- Name: immutable_unaccent(text); Type: FUNCTION; Schema: public; Owner: langmoc_user
--

CREATE FUNCTION public.immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
    AS $_$
  SELECT public.unaccent('public.unaccent'::regdictionary, $1);
$_$;


ALTER FUNCTION public.immutable_unaccent(text) OWNER TO langmoc_user;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: langmoc_user
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO langmoc_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    recipient_name character varying(120) NOT NULL,
    phone character varying(20) NOT NULL,
    province character varying(100) NOT NULL,
    district character varying(100) NOT NULL,
    ward character varying(100) NOT NULL,
    address_line character varying(255) NOT NULL,
    is_default boolean DEFAULT false NOT NULL
);


ALTER TABLE public.addresses OWNER TO langmoc_user;

--
-- Name: cart_items; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.cart_items (
    user_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO langmoc_user;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(120) NOT NULL,
    parent_id uuid,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.categories OWNER TO langmoc_user;

--
-- Name: contact_messages; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.contact_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    name character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    subject character varying(160) NOT NULL,
    message text NOT NULL,
    status character varying(12) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT contact_messages_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'read'::character varying, 'resolved'::character varying])::text[])))
);


ALTER TABLE public.contact_messages OWNER TO langmoc_user;

--
-- Name: order_items; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    seller_id uuid,
    product_name character varying(200) NOT NULL,
    product_image_url text,
    unit_price_vnd bigint NOT NULL,
    quantity integer NOT NULL,
    line_total_vnd bigint NOT NULL,
    CONSTRAINT order_items_check CHECK ((line_total_vnd = (unit_price_vnd * quantity))),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0)),
    CONSTRAINT order_items_unit_price_vnd_check CHECK ((unit_price_vnd >= 0))
);


ALTER TABLE public.order_items OWNER TO langmoc_user;

--
-- Name: orders; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_number character varying(30) NOT NULL,
    user_id uuid NOT NULL,
    recipient_name character varying(120) NOT NULL,
    phone character varying(20) NOT NULL,
    shipping_address text NOT NULL,
    note text,
    status character varying(16) DEFAULT 'pending'::character varying NOT NULL,
    payment_method character varying(12) NOT NULL,
    payment_status character varying(12) DEFAULT 'unpaid'::character varying NOT NULL,
    subtotal_vnd bigint NOT NULL,
    discount_vnd bigint DEFAULT 0 NOT NULL,
    shipping_fee_vnd bigint DEFAULT 0 NOT NULL,
    total_vnd bigint NOT NULL,
    promotion_id uuid,
    idempotency_key character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT orders_check CHECK (((total_vnd = ((subtotal_vnd - discount_vnd) + shipping_fee_vnd)) AND (total_vnd >= 0))),
    CONSTRAINT orders_check1 CHECK ((discount_vnd <= subtotal_vnd)),
    CONSTRAINT orders_discount_vnd_check CHECK ((discount_vnd >= 0)),
    CONSTRAINT orders_payment_method_check CHECK (((payment_method)::text = ANY ((ARRAY['cod'::character varying, 'bank_transfer'::character varying, 'gateway'::character varying])::text[]))),
    CONSTRAINT orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['unpaid'::character varying, 'pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT orders_shipping_fee_vnd_check CHECK ((shipping_fee_vnd >= 0)),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'packing'::character varying, 'shipping'::character varying, 'delivered'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT orders_subtotal_vnd_check CHECK ((subtotal_vnd >= 0))
);


ALTER TABLE public.orders OWNER TO langmoc_user;

--
-- Name: payment_attempts; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.payment_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    provider character varying(40) NOT NULL,
    provider_reference character varying(160),
    amount_vnd bigint NOT NULL,
    status character varying(12) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT payment_attempts_amount_vnd_check CHECK ((amount_vnd >= 0)),
    CONSTRAINT payment_attempts_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'succeeded'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[])))
);


ALTER TABLE public.payment_attempts OWNER TO langmoc_user;

--
-- Name: product_images; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.product_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    image_url text NOT NULL,
    alt_text character varying(255) DEFAULT ''::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    source_url text,
    CONSTRAINT product_images_sort_order_check CHECK ((sort_order >= 0))
);


ALTER TABLE public.product_images OWNER TO langmoc_user;

--
-- Name: products; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid,
    category_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(220) NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    material character varying(120),
    origin_province character varying(100),
    price_vnd bigint NOT NULL,
    sale_price_vnd bigint,
    sale_starts_at timestamp with time zone,
    sale_ends_at timestamp with time zone,
    stock_quantity integer DEFAULT 0 NOT NULL,
    status character varying(12) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    search_text text GENERATED ALWAYS AS (lower(public.immutable_unaccent((((((COALESCE(name, ''::character varying))::text || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || (COALESCE(material, ''::character varying))::text)))) STORED,
    sku character varying(60),
    source_name character varying(160),
    source_url text,
    collected_at timestamp with time zone,
    attributes jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_demo boolean DEFAULT false NOT NULL,
    price_is_demo boolean DEFAULT false NOT NULL,
    CONSTRAINT products_check CHECK (((sale_price_vnd >= 0) AND (sale_price_vnd < price_vnd))),
    CONSTRAINT products_check1 CHECK (((sale_starts_at IS NULL) OR (sale_ends_at IS NULL) OR (sale_ends_at > sale_starts_at))),
    CONSTRAINT products_price_vnd_check CHECK ((price_vnd >= 0)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'hidden'::character varying])::text[]))),
    CONSTRAINT products_stock_quantity_check CHECK ((stock_quantity >= 0))
);


ALTER TABLE public.products OWNER TO langmoc_user;

--
-- Name: promotions; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.promotions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(40) NOT NULL,
    discount_type character varying(8) NOT NULL,
    discount_value bigint NOT NULL,
    max_discount_vnd bigint,
    min_subtotal_vnd bigint DEFAULT 0 NOT NULL,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT promotions_check CHECK ((ends_at > starts_at)),
    CONSTRAINT promotions_check1 CHECK ((((discount_type)::text <> 'percent'::text) OR (discount_value <= 100))),
    CONSTRAINT promotions_check2 CHECK (((usage_limit IS NULL) OR (used_count <= usage_limit))),
    CONSTRAINT promotions_discount_type_check CHECK (((discount_type)::text = ANY ((ARRAY['fixed'::character varying, 'percent'::character varying])::text[]))),
    CONSTRAINT promotions_discount_value_check CHECK ((discount_value > 0)),
    CONSTRAINT promotions_max_discount_vnd_check CHECK ((max_discount_vnd > 0)),
    CONSTRAINT promotions_min_subtotal_vnd_check CHECK ((min_subtotal_vnd >= 0)),
    CONSTRAINT promotions_usage_limit_check CHECK ((usage_limit > 0)),
    CONSTRAINT promotions_used_count_check CHECK ((used_count >= 0))
);


ALTER TABLE public.promotions OWNER TO langmoc_user;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    user_id uuid NOT NULL,
    rating smallint NOT NULL,
    comment text DEFAULT ''::text NOT NULL,
    status character varying(12) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT reviews_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'visible'::character varying, 'hidden'::character varying])::text[])))
);


ALTER TABLE public.reviews OWNER TO langmoc_user;

--
-- Name: sellers; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.sellers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(160) NOT NULL,
    slug character varying(180) NOT NULL,
    craft_village character varying(160),
    province character varying(100),
    story text,
    status character varying(12) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sellers_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'hidden'::character varying])::text[])))
);


ALTER TABLE public.sellers OWNER TO langmoc_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    user_agent character varying(255),
    ip character varying(45),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


ALTER TABLE public.sessions OWNER TO langmoc_user;

--
-- Name: shipments; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    carrier character varying(80),
    tracking_number character varying(100),
    shipped_at timestamp with time zone,
    delivered_at timestamp with time zone
);


ALTER TABLE public.shipments OWNER TO langmoc_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: langmoc_user
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(120) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    phone character varying(20),
    role character varying(12) DEFAULT 'customer'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['customer'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO langmoc_user;

--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (user_id, product_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: contact_messages contact_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: orders orders_user_id_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);


--
-- Name: payment_attempts payment_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_pkey PRIMARY KEY (id);


--
-- Name: product_images product_images_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_key UNIQUE (slug);


--
-- Name: promotions promotions_code_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_code_key UNIQUE (code);


--
-- Name: promotions promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.promotions
    ADD CONSTRAINT promotions_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- Name: sellers sellers_slug_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_slug_key UNIQUE (slug);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: shipments shipments_order_id_key; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_key UNIQUE (order_id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: addresses_one_default_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE UNIQUE INDEX addresses_one_default_idx ON public.addresses USING btree (user_id) WHERE is_default;


--
-- Name: addresses_user_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX addresses_user_idx ON public.addresses USING btree (user_id);


--
-- Name: order_items_order_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX order_items_order_idx ON public.order_items USING btree (order_id);


--
-- Name: orders_status_date_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX orders_status_date_idx ON public.orders USING btree (status, created_at DESC);


--
-- Name: orders_user_date_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX orders_user_date_idx ON public.orders USING btree (user_id, created_at DESC);


--
-- Name: payment_provider_reference_uq; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE UNIQUE INDEX payment_provider_reference_uq ON public.payment_attempts USING btree (provider, provider_reference) WHERE (provider_reference IS NOT NULL);


--
-- Name: product_images_order_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX product_images_order_idx ON public.product_images USING btree (product_id, sort_order);


--
-- Name: product_images_product_sort_uq; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE UNIQUE INDEX product_images_product_sort_uq ON public.product_images USING btree (product_id, sort_order);


--
-- Name: products_browse_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX products_browse_idx ON public.products USING btree (status, category_id, created_at DESC);


--
-- Name: products_price_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX products_price_idx ON public.products USING btree (status, price_vnd);


--
-- Name: products_search_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX products_search_idx ON public.products USING gin (to_tsvector('simple'::regconfig, (((name)::text || ' '::text) || description)));


--
-- Name: products_sku_uq; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE UNIQUE INDEX products_sku_uq ON public.products USING btree (sku) WHERE (sku IS NOT NULL);


--
-- Name: reviews_public_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX reviews_public_idx ON public.reviews USING btree (product_id, created_at DESC) WHERE ((status)::text = 'visible'::text);


--
-- Name: sessions_expiry_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX sessions_expiry_idx ON public.sessions USING btree (expires_at) WHERE (revoked_at IS NULL);


--
-- Name: sessions_user_idx; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE INDEX sessions_user_idx ON public.sessions USING btree (user_id);


--
-- Name: users_email_ci_uq; Type: INDEX; Schema: public; Owner: langmoc_user
--

CREATE UNIQUE INDEX users_email_ci_uq ON public.users USING btree (lower((email)::text));


--
-- Name: orders orders_set_updated_at; Type: TRIGGER; Schema: public; Owner: langmoc_user
--

CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: products products_set_updated_at; Type: TRIGGER; Schema: public; Owner: langmoc_user
--

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users users_set_updated_at; Type: TRIGGER; Schema: public; Owner: langmoc_user
--

CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: addresses addresses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: cart_items cart_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: contact_messages contact_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.contact_messages
    ADD CONSTRAINT contact_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: order_items order_items_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE RESTRICT;


--
-- Name: orders orders_promotion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id) ON DELETE SET NULL;


--
-- Name: orders orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: payment_attempts payment_attempts_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.payment_attempts
    ADD CONSTRAINT payment_attempts_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- Name: product_images product_images_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.product_images
    ADD CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- Name: products products_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE RESTRICT;


--
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: langmoc_user
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict v5ZYtj2EaSXG7dOIxEIlx3IOjxfSIryo34z5UN6AOdfQQFxNp3kS3bNQpkczbwF

