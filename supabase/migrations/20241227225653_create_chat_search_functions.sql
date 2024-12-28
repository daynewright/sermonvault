CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS get_topic_overview(TEXT, UUID);
DROP FUNCTION IF EXISTS analyze_preaching_patterns(UUID, TEXT);
DROP FUNCTION IF EXISTS find_related_sermons(UUID, UUID, INT);
DROP FUNCTION IF EXISTS analyze_scripture_usage(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_theme_development(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_illustrations(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_sermon_series(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_sermon_style(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_personal_stories(UUID, TEXT);
DROP FUNCTION IF EXISTS analyze_sermon_tone(UUID, TEXT);

-- Function: get_topic_overview
-- Sample questions:
--   "How many times have I preached about forgiveness?"
--   "When was the first and last time I preached about grace?"
--   "What scriptures have I used when teaching about prayer?"
--   "Give me an overview of my sermons on marriage"
CREATE OR REPLACE FUNCTION get_topic_overview(
    p_topic TEXT,
    p_user_id UUID
)
RETURNS TABLE (
    topic TEXT,
    sermon_count INT,
    first_preached DATE,
    last_preached DATE,
    related_scriptures TEXT[],
    sermon_titles TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH topic_matches AS (
        SELECT s.*,
               GREATEST(
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.topics) t),
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.themes) t),
                   (SELECT COALESCE(MAX(similarity(k, p_topic)), 0)
                    FROM unnest(s.keywords) k)
               ) as match_score
        FROM sermons s
        WHERE user_id = p_user_id
    )
    SELECT 
        p_topic,
        COUNT(DISTINCT id)::INT,
        MIN(date),
        MAX(date),
        array_agg(DISTINCT primary_scripture),
        array_agg(DISTINCT title),
        array_agg(DISTINCT id)
    FROM topic_matches
    WHERE match_score > 0.3
    GROUP BY 1;
END;
$$;

-- Function: analyze_preaching_patterns
-- Sample questions:
--   "What are my most common sermon topics this year?"
--   "Which scriptures did I focus on last month?"
--   "Show me my preaching patterns by month"
--   "What themes do I typically cover during different seasons?"
CREATE OR REPLACE FUNCTION analyze_preaching_patterns(
    p_user_id UUID,
    p_timeframe TEXT
)
RETURNS TABLE (
    period TEXT,
    sermon_count INT,
    top_topics TEXT[],
    scriptures_used TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH sermon_topics AS (
        SELECT 
            to_char(s.date, 'YYYY-MM') as month_period,
            t.topic,
            s.primary_scripture,
            s.id
        FROM sermons s
        CROSS JOIN LATERAL unnest(s.topics) as t(topic)
        WHERE s.user_id = p_user_id
    ),
    top_topics_per_month AS (
        SELECT 
            month_period,
            array_agg(DISTINCT topic) as topics
        FROM (
            SELECT 
                month_period,
                topic,
                COUNT(*) as topic_count
            FROM sermon_topics
            GROUP BY month_period, topic
            ORDER BY month_period, COUNT(*) DESC
        ) t
        GROUP BY month_period
    )
    SELECT 
        st.month_period,
        COUNT(DISTINCT st.id)::INT,
        tt.topics,
        array_agg(DISTINCT st.primary_scripture),
        array_agg(DISTINCT st.id)
    FROM sermon_topics st
    LEFT JOIN top_topics_per_month tt ON tt.month_period = st.month_period
    GROUP BY st.month_period, tt.topics
    ORDER BY st.month_period DESC;
END;
$$;

-- Find sermons with similar themes/topics
-- Function: find_related_sermons
-- Sample questions:
--   "What other sermons are similar to my sermon on John 3:16?"
--   "Find sermons related to my message about grace from last Sunday"
--   "What other messages have I preached with similar themes?"
--   "Show me sermons that cover the same topics as [sermon title]"
CREATE OR REPLACE FUNCTION find_related_sermons(
    p_sermon_id UUID,
    p_user_id UUID,
    p_limit INT DEFAULT 5
)
RETURNS TABLE (
    sermon_id UUID,
    title TEXT,
    date DATE,
    shared_topics TEXT[],
    shared_scriptures TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH source_sermon AS (
        SELECT topics, themes, scriptures
        FROM sermons
        WHERE id = p_sermon_id AND user_id = p_user_id
    )
    SELECT 
        s.id,
        s.title,
        s.date,
        ARRAY(
            SELECT UNNEST(s.topics || s.themes)
            INTERSECT
            SELECT UNNEST(src.topics || src.themes)
            FROM source_sermon src
        ),
        ARRAY(
            SELECT UNNEST(s.scriptures)
            INTERSECT
            SELECT UNNEST(src.scriptures)
            FROM source_sermon src
        )
    FROM sermons s, source_sermon src
    WHERE s.user_id = p_user_id
    AND s.id != p_sermon_id
    AND (
        s.topics && src.topics
        OR s.themes && src.themes
        OR s.scriptures && src.scriptures
    )
    ORDER BY 
        array_length(
            ARRAY(
                SELECT UNNEST(s.topics || s.themes)
                INTERSECT
                SELECT UNNEST(src.topics || src.themes)
            ),
            1
        ) DESC
    LIMIT p_limit;
END;
$$;

-- Function: analyze_scripture_usage
-- Sample questions:
--   "How often do I preach from the book of Romans?"
--   "What are my most frequently referenced scriptures?"
--   "When was the last time I preached from Psalms?"
--   "What topics do I usually cover when preaching from John?"
CREATE OR REPLACE FUNCTION analyze_scripture_usage(
    p_user_id UUID,
    p_book TEXT DEFAULT NULL
)
RETURNS TABLE (
    scripture TEXT,
    usage_count INT,
    last_used DATE,
    sermon_titles TEXT[],
    related_topics TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH scripture_matches AS (
        SELECT s.*,
               CASE WHEN p_book IS NULL THEN 1.0
               ELSE GREATEST(
                   similarity(s.primary_scripture, p_book),
                   (SELECT COALESCE(MAX(similarity(sc, p_book)), 0)
                    FROM unnest(s.scriptures) sc)
               ) END as match_score
        FROM sermons s
        WHERE s.user_id = p_user_id
    )
    SELECT 
        COALESCE(s.primary_scripture, sc) as scripture,
        COUNT(DISTINCT s.id)::INT,
        MAX(s.date),
        array_agg(DISTINCT s.title),
        array_agg(DISTINCT unnest(s.topics || s.themes)),
        array_agg(DISTINCT s.id)
    FROM scripture_matches s
    CROSS JOIN LATERAL unnest(s.scriptures) as sc
    WHERE match_score > 0.3
    GROUP BY COALESCE(s.primary_scripture, sc)
    ORDER BY COUNT(DISTINCT s.id) DESC;
END;
$$;

-- Function: analyze_theme_development
-- Sample questions:
--   "How has my teaching on grace evolved over the years?"
--   "Show me how my approach to teaching about faith has changed"
--   "What scriptures have I used to teach about love each year?"
--   "How have my sermon themes about marriage developed?"
CREATE OR REPLACE FUNCTION analyze_theme_development(
    p_user_id UUID,
    p_theme TEXT
)
RETURNS TABLE (
    year INT,
    sermon_count INT,
    scriptures_used TEXT[],
    related_themes TEXT[],
    sermon_titles TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH theme_matches AS (
        SELECT s.*,
               GREATEST(
                   (SELECT COALESCE(MAX(similarity(t, p_theme)), 0)
                    FROM unnest(s.topics) t),
                   (SELECT COALESCE(MAX(similarity(t, p_theme)), 0)
                    FROM unnest(s.themes) t),
                   (SELECT COALESCE(MAX(similarity(k, p_theme)), 0)
                    FROM unnest(s.keywords) k)
               ) as match_score
        FROM sermons s
        WHERE user_id = p_user_id
    )
    SELECT 
        EXTRACT(YEAR FROM date)::INT,
        COUNT(DISTINCT id)::INT,
        array_agg(DISTINCT primary_scripture),
        array_agg(DISTINCT unnest(themes)),
        array_agg(DISTINCT title),
        array_agg(DISTINCT id)
    FROM theme_matches
    WHERE match_score > 0.3
    GROUP BY EXTRACT(YEAR FROM date)
    ORDER BY EXTRACT(YEAR FROM date);
END;
$$;

-- Function: analyze_illustrations
-- Sample questions:
--   "What illustrations do I use most often?"
--   "Show me illustrations I've used when teaching about faith"
--   "Am I repeating any illustrations too frequently?"
--   "When was the last time I used [specific illustration]?"
CREATE OR REPLACE FUNCTION analyze_illustrations(
    p_user_id UUID,
    p_topic TEXT DEFAULT NULL
)
RETURNS TABLE (
    illustration TEXT,
    times_used INT,
    sermon_titles TEXT[],
    related_topics TEXT[],
    last_used DATE,
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH topic_matches AS (
        SELECT s.*,
               CASE WHEN p_topic IS NULL THEN 1.0
               ELSE GREATEST(
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.topics) t),
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.themes) t)
               ) END as match_score
        FROM sermons s
        WHERE s.user_id = p_user_id
    )
    SELECT 
        ps.story,
        COUNT(DISTINCT s.id)::INT,
        array_agg(DISTINCT s.title),
        array_agg(DISTINCT unnest(s.topics || s.themes)),
        MAX(s.date),
        array_agg(DISTINCT s.id)
    FROM topic_matches s
    CROSS JOIN LATERAL unnest(s.illustrations) as ps(story)
    WHERE match_score > 0.3
    GROUP BY ps.story
    ORDER BY COUNT(DISTINCT s.id) DESC;
END;
$$;

-- Function: analyze_sermon_series
-- Sample questions:
--   "What series have I preached in the last year?"
--   "How long was my series on [topic]?"
--   "What was the engagement/response to my series on [topic]?"
--   "Which series covered multiple books of the Bible?"
CREATE OR REPLACE FUNCTION analyze_sermon_series(
    p_user_id UUID,
    p_series_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    series_name TEXT,
    sermon_count INT,
    start_date DATE,
    end_date DATE,
    topics_covered TEXT[],
    scriptures_used TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH series_matches AS (
        SELECT s.*,
               CASE WHEN p_series_name IS NULL THEN 1.0
               ELSE similarity(s.series, p_series_name)
               END as match_score
        FROM sermons s
        WHERE s.user_id = p_user_id
        AND s.series IS NOT NULL
    )
    SELECT 
        s.series,
        COUNT(*)::INT,
        MIN(s.date),
        MAX(s.date),
        array_agg(DISTINCT unnest(s.topics || s.themes)),
        array_agg(DISTINCT s.primary_scripture),
        array_agg(s.id)
    FROM series_matches s
    WHERE match_score > 0.3
    GROUP BY s.series
    ORDER BY MIN(s.date) DESC;
END;
$$;

-- Function: analyze_sermon_style
-- Sample questions:
--   "What type of sermons do I preach most often?"
--   "Do I favor expository or topical preaching?"
--   "How has my preaching style changed over time?"
--   "When was the last time I preached a narrative sermon?"
CREATE OR REPLACE FUNCTION analyze_sermon_style(
    p_user_id UUID,
    p_timeframe TEXT DEFAULT 'all'
)
RETURNS TABLE (
    sermon_type TEXT,
    count INT,
    percentage DECIMAL,
    avg_word_count INT,
    common_topics TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.sermon_type,
        COUNT(*)::INT,
        COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER () * 100,
        AVG(s.word_count)::INT,
        array_agg(DISTINCT t.topic) FILTER (
            WHERE t.topic = ANY(
                SELECT unnest(topics)
                GROUP BY 1
                ORDER BY COUNT(*) DESC
                LIMIT 5
            )
        ),
        array_agg(s.id)
    FROM sermons s
    CROSS JOIN LATERAL unnest(s.topics) as t(topic)
    WHERE s.user_id = p_user_id
    GROUP BY s.sermon_type;
END;
$$;

-- Function: analyze_personal_stories
-- Sample questions:
--   "How often do I share personal stories?"
--   "What topics do I usually connect with personal examples?"
--   "Am I sharing too many/few personal experiences?"
--   "What personal stories have I shared about [topic]?"
CREATE OR REPLACE FUNCTION analyze_personal_stories(
    p_user_id UUID,
    p_topic TEXT DEFAULT NULL
)
RETURNS TABLE (
    story TEXT,
    times_used INT,
    related_topics TEXT[],
    sermon_dates DATE[],
    sermon_titles TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH topic_matches AS (
        SELECT s.*,
               CASE WHEN p_topic IS NULL THEN 1.0
               ELSE GREATEST(
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.topics) t),
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.themes) t)
               ) END as match_score
        FROM sermons s
        WHERE s.user_id = p_user_id
    )
    SELECT 
        ps.story,
        COUNT(DISTINCT s.id)::INT,
        array_agg(DISTINCT unnest(s.topics || s.themes)),
        array_agg(s.date),
        array_agg(s.title),
        array_agg(s.id)
    FROM topic_matches s
    CROSS JOIN LATERAL unnest(s.personal_stories) as ps(story)
    WHERE match_score > 0.3
    GROUP BY ps.story
    ORDER BY COUNT(DISTINCT s.id) DESC;
END;
$$;

-- Function: analyze_sermon_tone
-- Sample questions:
--   "What's the typical tone of my messages?"
--   "Do I preach more encouraging or challenging sermons?"
--   "How does my sermon tone vary by topic?"
--   "What's my tone when preaching about [topic]?"
CREATE OR REPLACE FUNCTION analyze_sermon_tone(
    p_user_id UUID,
    p_topic TEXT DEFAULT NULL
)
RETURNS TABLE (
    tone TEXT,
    count INT,
    common_topics TEXT[],
    example_sermons TEXT[],
    sermon_ids UUID[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH topic_matches AS (
        SELECT s.*,
               CASE WHEN p_topic IS NULL THEN 1.0
               ELSE GREATEST(
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.topics) t),
                   (SELECT COALESCE(MAX(similarity(t, p_topic)), 0)
                    FROM unnest(s.themes) t),
                   (SELECT COALESCE(MAX(similarity(k, p_topic)), 0)
                    FROM unnest(s.keywords) k)
               ) END as match_score
        FROM sermons s
        WHERE s.user_id = p_user_id
    )
    SELECT 
        s.tone,
        COUNT(*)::INT,
        array_agg(DISTINCT unnest(s.topics)) FILTER (WHERE unnest(s.topics) = ANY(
            SELECT t.topic
            FROM topic_matches s2
            CROSS JOIN LATERAL unnest(s2.topics) as t(topic)
            WHERE s2.tone = s.tone
            GROUP BY t.topic
            ORDER BY COUNT(*) DESC
            LIMIT 5
        )),
        array_agg(s.title) FILTER (WHERE s.title = ANY(
            SELECT title 
            FROM topic_matches 
            WHERE tone = s.tone 
            ORDER BY date DESC 
            LIMIT 3
        )),
        array_agg(s.id)
    FROM topic_matches s
    WHERE match_score > 0.3
    GROUP BY s.tone;
END;
$$;



