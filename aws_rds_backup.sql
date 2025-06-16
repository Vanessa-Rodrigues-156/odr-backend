--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: MeetingStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MeetingStatus" AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."MeetingStatus" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'INNOVATOR',
    'MENTOR',
    'ADMIN',
    'OTHER'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Comment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Comment" (
    id text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ideaId" text NOT NULL,
    "userId" text NOT NULL,
    "parentId" text
);


ALTER TABLE public."Comment" OWNER TO postgres;

--
-- Name: Idea; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Idea" (
    id text NOT NULL,
    title text NOT NULL,
    caption text,
    description text NOT NULL,
    "priorOdrExperience" text,
    approved boolean DEFAULT false NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ownerId" text NOT NULL,
    views integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."Idea" OWNER TO postgres;

--
-- Name: IdeaCollaborator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IdeaCollaborator" (
    "userId" text NOT NULL,
    "ideaId" text NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IdeaCollaborator" OWNER TO postgres;

--
-- Name: IdeaMentor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IdeaMentor" (
    "userId" text NOT NULL,
    "ideaId" text NOT NULL,
    "assignedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."IdeaMentor" OWNER TO postgres;

--
-- Name: IdeaSubmission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."IdeaSubmission" (
    id text NOT NULL,
    title text NOT NULL,
    caption text,
    description text NOT NULL,
    "priorOdrExperience" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ownerId" text NOT NULL,
    reviewed boolean DEFAULT false NOT NULL,
    "reviewedAt" timestamp(3) without time zone,
    "reviewedBy" text,
    approved boolean DEFAULT false NOT NULL,
    rejected boolean DEFAULT false NOT NULL,
    "rejectionReason" text
);


ALTER TABLE public."IdeaSubmission" OWNER TO postgres;

--
-- Name: Like; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Like" (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL,
    "ideaId" text,
    "commentId" text
);


ALTER TABLE public."Like" OWNER TO postgres;

--
-- Name: MeetingLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MeetingLog" (
    id text NOT NULL,
    title text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone,
    "recordingUrl" text,
    summary text,
    status public."MeetingStatus" DEFAULT 'SCHEDULED'::public."MeetingStatus" NOT NULL,
    "jitsiRoomName" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ideaId" text NOT NULL,
    "createdById" text NOT NULL
);


ALTER TABLE public."MeetingLog" OWNER TO postgres;

--
-- Name: MeetingNote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MeetingNote" (
    id text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "meetingId" text NOT NULL,
    "authorId" text NOT NULL,
    "lastEditedById" text
);


ALTER TABLE public."MeetingNote" OWNER TO postgres;

--
-- Name: MeetingParticipant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MeetingParticipant" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "meetingId" text NOT NULL,
    "joinTime" timestamp(3) without time zone,
    "leaveTime" timestamp(3) without time zone,
    "isPresenter" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."MeetingParticipant" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text,
    "contactNumber" text,
    city text,
    country text,
    "userRole" public."UserRole" DEFAULT 'INNOVATOR'::public."UserRole" NOT NULL,
    institution text,
    "highestEducation" text,
    "odrLabUsage" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "imageAvatar" text
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Comment" (id, content, "createdAt", "ideaId", "userId", "parentId") FROM stdin;
085ae514-694c-4df7-a1ea-6da7f55d2f95	very nice idea . I would like to collaborate	2025-06-13 16:59:04.751	18d47acd-6612-4dab-8043-3626654f9932	5ed3d316-f64c-4226-828e-3a072bed8cb8	\N
c5a4957b-4610-4e9f-b276-69af00812a11	Great idea, I would love to Collaborate with you on this project!	2025-06-14 13:03:53.001	0dd4a2af-c103-4e9f-9201-973ed8d63dcd	98e61712-be74-4325-b010-be69ebc733e3	\N
ff21a5db-765a-4942-b7a2-ca6770da4251	Its a great idea . Let me know the specific laws applicable\n	2025-06-14 13:04:05.539	0dd4a2af-c103-4e9f-9201-973ed8d63dcd	5ed3d316-f64c-4226-828e-3a072bed8cb8	\N
d887ffd8-9b5f-4f73-89be-cb86c7b585ef	Great Idea Ma'am	2025-06-14 13:46:29.953	de20c166-72ca-4b87-871b-0cbdcf734d0b	bdf92df2-ead5-4d95-8cd1-941d74d943ea	\N
\.


--
-- Data for Name: Idea; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Idea" (id, title, caption, description, "priorOdrExperience", approved, "reviewedAt", "reviewedBy", "createdAt", "updatedAt", "ownerId", views) FROM stdin;
18d47acd-6612-4dab-8043-3626654f9932	This is a test idea.	This is for test purposes 	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.	t	2025-06-11 18:20:35.166	98e61712-be74-4325-b010-be69ebc733e3	2025-06-11 18:20:35.167	2025-06-11 18:20:35.167	98e61712-be74-4325-b010-be69ebc733e3	0
de20c166-72ca-4b87-871b-0cbdcf734d0b	ODR systems for Consumer Disputes 	\N	---	--	t	2025-06-13 17:12:02.961	98e61712-be74-4325-b010-be69ebc733e3	2025-06-13 17:12:02.962	2025-06-13 17:12:02.962	5ed3d316-f64c-4226-828e-3a072bed8cb8	0
adbdbb37-9e00-4336-b5af-0116097a4969	Consent ODR for Consent Management & Digital Marketing Privacy	‘By MY Permission Only’	Misuse of Consent: Data collected with consent for one purpose being used for an entirely different, undisclosed purpose.\n\nConsent Process Review: The ODR platform could allow for submission and review of consent forms, privacy notices, cookie banners, and consent flows to assess their compliance with DPDP Act principles.\n\nConsent Review: one of the features could be a service where a data principal can request an independent "consent review" of how a specific company collected and managed their consent.	No	t	2025-06-14 13:01:42.022	98e61712-be74-4325-b010-be69ebc733e3	2025-06-14 13:01:42.023	2025-06-14 13:01:42.023	9e578e5c-3e19-44dd-bc7c-d6b3bb0f9122	0
0dd4a2af-c103-4e9f-9201-973ed8d63dcd	Cyber fraud golden hour	How to help in golden Hour	Once we get connected by the Victim and he providing all necessary information, we can access their devices and block their Bank accounts further even at Night 1 clock when there are not much active people or authorities to help , thereby helping maximum in Golden Hours	NO	t	2025-06-14 13:02:21.31	98e61712-be74-4325-b010-be69ebc733e3	2025-06-14 13:02:21.31	2025-06-14 13:02:21.31	50952e49-005f-43dd-a8a0-05ddb4753c5b	0
\.


--
-- Data for Name: IdeaCollaborator; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IdeaCollaborator" ("userId", "ideaId", "joinedAt") FROM stdin;
98e61712-be74-4325-b010-be69ebc733e3	0dd4a2af-c103-4e9f-9201-973ed8d63dcd	2025-06-14 13:05:13.636
5cf83484-436d-4f15-9178-1a4aee57a728	0dd4a2af-c103-4e9f-9201-973ed8d63dcd	2025-06-14 13:07:27.029
5ed3d316-f64c-4226-828e-3a072bed8cb8	adbdbb37-9e00-4336-b5af-0116097a4969	2025-06-14 13:46:08.019
bdf92df2-ead5-4d95-8cd1-941d74d943ea	de20c166-72ca-4b87-871b-0cbdcf734d0b	2025-06-15 17:21:08.177
98e61712-be74-4325-b010-be69ebc733e3	de20c166-72ca-4b87-871b-0cbdcf734d0b	2025-06-15 17:25:59.654
\.


--
-- Data for Name: IdeaMentor; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IdeaMentor" ("userId", "ideaId", "assignedAt") FROM stdin;
5ed3d316-f64c-4226-828e-3a072bed8cb8	0dd4a2af-c103-4e9f-9201-973ed8d63dcd	2025-06-14 13:03:24.845
\.


--
-- Data for Name: IdeaSubmission; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."IdeaSubmission" (id, title, caption, description, "priorOdrExperience", "createdAt", "updatedAt", "ownerId", reviewed, "reviewedAt", "reviewedBy", approved, rejected, "rejectionReason") FROM stdin;
b8ff3b7b-7e37-45ee-823d-60c1605bf095	This is a test idea.	This is for test purposes 	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.	Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.	2025-06-11 18:20:22.37	2025-06-11 18:20:35.173	98e61712-be74-4325-b010-be69ebc733e3	t	2025-06-11 18:20:35.172	98e61712-be74-4325-b010-be69ebc733e3	t	f	\N
8bd2020c-7b50-4e00-af84-de041df22eeb	ODR systems for Consumer Disputes 	\N	---	--	2025-06-13 17:10:33.477	2025-06-13 17:12:02.966	5ed3d316-f64c-4226-828e-3a072bed8cb8	t	2025-06-13 17:12:02.965	98e61712-be74-4325-b010-be69ebc733e3	t	f	\N
99109383-fa89-426f-a116-bcf2eb440391	Consent ODR for Consent Management & Digital Marketing Privacy	‘By MY Permission Only’	Misuse of Consent: Data collected with consent for one purpose being used for an entirely different, undisclosed purpose.\n\nConsent Process Review: The ODR platform could allow for submission and review of consent forms, privacy notices, cookie banners, and consent flows to assess their compliance with DPDP Act principles.\n\nConsent Review: one of the features could be a service where a data principal can request an independent "consent review" of how a specific company collected and managed their consent.	No	2025-06-14 11:44:57.613	2025-06-14 13:01:42.034	9e578e5c-3e19-44dd-bc7c-d6b3bb0f9122	t	2025-06-14 13:01:42.033	98e61712-be74-4325-b010-be69ebc733e3	t	f	\N
f8f32406-2604-4837-bc2f-c99170af54d6	Cyber fraud golden hour	How to help in golden Hour	Once we get connected by the Victim and he providing all necessary information, we can access their devices and block their Bank accounts further even at Night 1 clock when there are not much active people or authorities to help , thereby helping maximum in Golden Hours	NO	2025-06-14 08:25:48.149	2025-06-14 13:02:21.313	50952e49-005f-43dd-a8a0-05ddb4753c5b	t	2025-06-14 13:02:21.313	98e61712-be74-4325-b010-be69ebc733e3	t	f	\N
\.


--
-- Data for Name: Like; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Like" (id, "createdAt", "userId", "ideaId", "commentId") FROM stdin;
6ea355bd-a100-456c-ac49-5e02d5d79c47	2025-06-13 17:00:00.475	5ed3d316-f64c-4226-828e-3a072bed8cb8	18d47acd-6612-4dab-8043-3626654f9932	\N
\.


--
-- Data for Name: MeetingLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MeetingLog" (id, title, "startTime", "endTime", "recordingUrl", summary, status, "jitsiRoomName", "createdAt", "updatedAt", "ideaId", "createdById") FROM stdin;
\.


--
-- Data for Name: MeetingNote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MeetingNote" (id, content, "createdAt", "updatedAt", "meetingId", "authorId", "lastEditedById") FROM stdin;
\.


--
-- Data for Name: MeetingParticipant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MeetingParticipant" (id, "userId", "meetingId", "joinTime", "leaveTime", "isPresenter") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, password, "contactNumber", city, country, "userRole", institution, "highestEducation", "odrLabUsage", "createdAt", "imageAvatar") FROM stdin;
98e61712-be74-4325-b010-be69ebc733e3	Vanessa Freeman Rodrigues	vanessarodrigues010506@gmail.com	$2a$10$TlLl2jY8dPhojx39430YI.FY0OiLmmB.2X7u0Nm3568b4Tv0mA8HG	09763283600	mumbai	India	ADMIN	Fr CRCE	Engineering Undergraduate	As a student of Computer Engineering  (ongoing) at Fr CRCE. admin@vanessa	2025-06-07 14:25:10.032	\N
f1ad250a-37fe-4500-8a28-88734c2b2215	Dr Malti Suri	malti.suri@mahindrauniversity.edu.in	$2a$10$ggNls5ttsENy4SIVAEw53ewMfMzs8fWXUieh5HcNpgZnCqqg1Nqka	9573095904	Hyderabad	India	MENTOR	Mahindra University 	BA LLB (Hons.) LLM Ph.d 	As a legal professional at Mahindra University . 	2025-06-12 06:00:16.063	\N
0ff40d00-c8fb-4e7c-84fe-69415eddcbec	Anjali Singh	anjalisingh50624@gmail.com	$2a$10$fF4P/lOLVD/kX7qPdYul8e/WZ2zmLHKLSTHXj9W0RK90F4.uCj5HO	93222222	Mumbai	India	ADMIN	Odr lab	Ggg	As a Developer at Odr lab. Developer	2025-06-11 18:23:56.908	\N
74100602-8545-4b16-857b-7ee74a13e81d	Anjali Singh	anjalisingh24506@gmail.com	$2a$10$SFd9Vk4AC9uVr/3dOT3NZunPelSc/lKVBK1JS8NtKCtG5Bb./.7bG	999999999999999	Annnn	ncjdnfvjk	INNOVATOR	njdknsdfgn	smnjkfsndj	As a student of fndjfngi (ongoing) at njdknsdfgn. 	2025-06-15 11:23:17.045	\N
2381fa3d-180a-4631-8f3c-1a2c41dc4fd7	Rodrigues	vanessarodrigues@gmail.com	$2a$10$/gkRR0bIkXeAyt5aAwtcsebN3CoUDTehDe4NE7gts8x9CmQ/CBeea	 +91 274276	mumbai	India	MENTOR	qwertyuiop	hehe BTECH in CYBERSECURITY	Technical mentor (the tech head ) at qwertyuiop. As a the tech head  at qwertyuiop. I am the best candidate for this position\n\nMETADATA:{"mainUserType":"mentor","userType":"tech","description":"As a the tech head  at qwertyuiop. I am the best candidate for this position","tech":{"organization":"qwertyuiop","role":"the tech head "}}	2025-06-16 16:33:36.503	\N
508d4bc8-6eaf-486e-ac29-a9a4a699b40c	Aastha Bhatia	aasthabhatia32@gmail.com	$2a$10$NaNiiuBV6KW/g3/IIJZv2..btad2aIo72JyCGJfA5vTqtpktSUXzu	7279035608	Mumbai	India	MENTOR	Fr.CRCE	MA 	As a Asst.Professor  at Fr.CRCE. As a Communication Skills enthusiast, I guide Techlegal students to communicate tersely and sagaciously, helping them emerge with apt solutions.	2025-06-12 04:59:11.224	\N
5ed3d316-f64c-4226-828e-3a072bed8cb8	Dr. Suman Kalani	sumankalani@gmail.com	$2a$10$q4RxuecTFRVs3mF7n.8pg.Okwl0KNYOy7noUfCA6v.RWqq5DwfXBW	9867011447	Mumbai	India	MENTOR	SVKM's Pravin Gandhi College of Law	Ph.D	As a legal professional at SVKM's Pravin Gandhi College of Law. I am a researcher and trainer specializing in Dispute Resolution, with a focus on Online Dispute Resolution (ODR) — the subject of my Ph.D. research. My passion lies in fostering innovative thinking to design accessible and effective dispute resolution systems. \n\n\n	2025-06-12 04:20:42.377	\N
bdf92df2-ead5-4d95-8cd1-941d74d943ea	Savona Mendes	savonamendes@gmail.com	\N	08928389660	mumbai	India	OTHER	\N	masters	qwertyuiop	2025-06-12 20:00:10.091	\N
62cfca9a-ea15-48d0-aabe-8d90d6f534e9	Harshil Mehta	harshildas100@gmail.com	$2a$10$DPxj1g.846XRIUqhQUmbFujU9KvhsHtaSB51PrYkyphAU/gvYOpN6	9405183477	Nashik	India	OTHER	Nashik 	LLM	As a Advocate  at Nashik . 	2025-06-13 13:21:01.584	\N
da952a62-b46c-4d6d-82c7-199c254c3ef5	Priyanka V Pandit	priyanka@remediumlegal.com	$2a$10$LDaqF1zwDRc2wFeKLPXY9eV52diDi5gCJ4LFpWQRzm3T3YmHcdNA6	+919870317364	Mumbai	India	MENTOR	Priyanka V Pandit	BLS-LLM, PGD Intl. Cyber Laws, DCPLA, Mediator (India & UK)	As a legal professional at Priyanka V Pandit. 	2025-06-14 05:23:43.443	\N
50952e49-005f-43dd-a8a0-05ddb4753c5b	Drumin 	shahdrumin@gmail.com	$2a$10$H7EEWAwrfs5uJYuH26kKWuOnM7DR9s4MbhlQWbsRVPMUI1SRCBCqW	9167405787	MUMBAI	India	INNOVATOR	Mumbai University 	L.L.B. 	As a student of L.L.B (completed) at Mumbai University . 	2025-06-14 08:18:36.298	\N
9e578e5c-3e19-44dd-bc7c-d6b3bb0f9122	Vinod Chandnani	vinodtchandnani@gmail.com	$2a$10$NEc5aHK0o8PK0xA2TebG0O/sSSGa./6eATFyrrPOW5qJ8f3D6Gn0W	9619919771	Mumbai	India	MENTOR	Patel Engineering Ltd	MBA	As a Chief Information Officer at Patel Engineering Ltd. 	2025-06-14 11:30:59.664	\N
5cf83484-436d-4f15-9178-1a4aee57a728	Samarth Jain	samarth.jain2804@gmail.com	$2a$10$ar3gVcAo5iwiWEaRL9ayDOCsmUIscRK.jATouLjFE4VuRBt5Rjjs.	9137163986	Mumbai	India	INNOVATOR	O.P. Jindal Global University	undergraduate law	As a student of B.A. LLB (ongoing) at O.P. Jindal Global University. 	2025-06-14 13:04:30.829	\N
\.


--
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- Name: IdeaCollaborator IdeaCollaborator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaCollaborator"
    ADD CONSTRAINT "IdeaCollaborator_pkey" PRIMARY KEY ("userId", "ideaId");


--
-- Name: IdeaMentor IdeaMentor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaMentor"
    ADD CONSTRAINT "IdeaMentor_pkey" PRIMARY KEY ("userId", "ideaId");


--
-- Name: IdeaSubmission IdeaSubmission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaSubmission"
    ADD CONSTRAINT "IdeaSubmission_pkey" PRIMARY KEY (id);


--
-- Name: Idea Idea_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Idea"
    ADD CONSTRAINT "Idea_pkey" PRIMARY KEY (id);


--
-- Name: Like Like_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_pkey" PRIMARY KEY (id);


--
-- Name: MeetingLog MeetingLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingLog"
    ADD CONSTRAINT "MeetingLog_pkey" PRIMARY KEY (id);


--
-- Name: MeetingNote MeetingNote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingNote"
    ADD CONSTRAINT "MeetingNote_pkey" PRIMARY KEY (id);


--
-- Name: MeetingParticipant MeetingParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingParticipant"
    ADD CONSTRAINT "MeetingParticipant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Like_userId_commentId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Like_userId_commentId_key" ON public."Like" USING btree ("userId", "commentId");


--
-- Name: Like_userId_ideaId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Like_userId_ideaId_key" ON public."Like" USING btree ("userId", "ideaId");


--
-- Name: MeetingLog_jitsiRoomName_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MeetingLog_jitsiRoomName_key" ON public."MeetingLog" USING btree ("jitsiRoomName");


--
-- Name: MeetingParticipant_userId_meetingId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "MeetingParticipant_userId_meetingId_key" ON public."MeetingParticipant" USING btree ("userId", "meetingId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: Comment Comment_ideaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES public."Idea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Comment Comment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Comment Comment_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IdeaCollaborator IdeaCollaborator_ideaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaCollaborator"
    ADD CONSTRAINT "IdeaCollaborator_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES public."Idea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IdeaCollaborator IdeaCollaborator_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaCollaborator"
    ADD CONSTRAINT "IdeaCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IdeaMentor IdeaMentor_ideaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaMentor"
    ADD CONSTRAINT "IdeaMentor_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES public."Idea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: IdeaMentor IdeaMentor_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaMentor"
    ADD CONSTRAINT "IdeaMentor_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: IdeaSubmission IdeaSubmission_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."IdeaSubmission"
    ADD CONSTRAINT "IdeaSubmission_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Idea Idea_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Idea"
    ADD CONSTRAINT "Idea_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Like Like_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."Comment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_ideaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES public."Idea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Like Like_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Like"
    ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MeetingLog MeetingLog_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingLog"
    ADD CONSTRAINT "MeetingLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MeetingLog MeetingLog_ideaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingLog"
    ADD CONSTRAINT "MeetingLog_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES public."Idea"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeetingNote MeetingNote_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingNote"
    ADD CONSTRAINT "MeetingNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MeetingNote MeetingNote_lastEditedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingNote"
    ADD CONSTRAINT "MeetingNote_lastEditedById_fkey" FOREIGN KEY ("lastEditedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: MeetingNote MeetingNote_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingNote"
    ADD CONSTRAINT "MeetingNote_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."MeetingLog"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeetingParticipant MeetingParticipant_meetingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingParticipant"
    ADD CONSTRAINT "MeetingParticipant_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES public."MeetingLog"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: MeetingParticipant MeetingParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MeetingParticipant"
    ADD CONSTRAINT "MeetingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

