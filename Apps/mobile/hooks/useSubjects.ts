import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BrowserSubjectMatch, Topic, TopicFilter } from '@/types/child';

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function rankText(query: string, source: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedSource = normalizeText(source);

  if (!normalizedQuery || !normalizedSource) {
    return 0;
  }

  if (normalizedSource === normalizedQuery) {
    return 100;
  }

  if (normalizedSource.startsWith(normalizedQuery)) {
    return 80;
  }

  if (normalizedSource.includes(normalizedQuery)) {
    return 50;
  }

  return 0;
}

function topicMatchesFilter(topic: Topic, filter: TopicFilter): boolean {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'completed') {
    return topic.isCompleted;
  }

  if (filter === 'inProgress') {
    return !topic.isCompleted;
  }

  if (filter === 'new') {
    return !topic.isCompleted && !topic.completedAt;
  }

  return true;
}

export function useSubjects() {
  const {
    childProfile,
    subjects,
    topics,
    recentActivity,
    childDataLoading,
    childDataError,
    refreshChildData,
    markSubjectAccess,
    completeTopic,
  } = useAuth();

  const selectedSubjects = useMemo(() => {
    if (!childProfile) {
      return [];
    }

    return subjects
      .filter((subject) => childProfile.subjectIds.includes(subject.id))
      .sort(
        (a, b) =>
          new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
      );
  }, [childProfile, subjects]);

  const activity = useMemo(
    () =>
      [...recentActivity].sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      ),
    [recentActivity]
  );

  function getSubjectById(subjectId: string) {
    return subjects.find((subject) => subject.id === subjectId);
  }

  function getTopicsBySubject(subjectId: string): Topic[] {
    return topics.filter((topic) => topic.subjectId === subjectId);
  }

  function getRankedSubjects(query: string): BrowserSubjectMatch[] {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return subjects.map((subject) => ({ subject, score: 1 }));
    }

    return subjects
      .map((subject) => {
        const titleScore = rankText(normalizedQuery, subject.title);
        const descriptionScore = rankText(normalizedQuery, subject.description ?? '');

        const topicScore = getTopicsBySubject(subject.id).reduce((highest, topic) => {
          const titleRank = rankText(normalizedQuery, topic.title);
          const descriptionRank = rankText(normalizedQuery, topic.description ?? '');
          return Math.max(highest, titleRank, descriptionRank);
        }, 0);

        return {
          subject,
          score: Math.max(titleScore, descriptionScore, topicScore),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
  }

  function filterTopics(params: {
    subjectId: string;
    query: string;
    filter: TopicFilter;
  }): Topic[] {
    const normalizedQuery = normalizeText(params.query);

    return getTopicsBySubject(params.subjectId)
      .filter((topic) => topicMatchesFilter(topic, params.filter))
      .map((topic) => {
        const titleScore = rankText(normalizedQuery, topic.title);
        const descriptionScore = rankText(normalizedQuery, topic.description ?? '');

        const score = normalizedQuery ? Math.max(titleScore, descriptionScore) : 1;

        return {
          topic,
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.topic);
  }

  return {
    allSubjects: subjects,
    selectedSubjects,
    topics,
    activity,
    childDataLoading,
    childDataError,
    getSubjectById,
    getTopicsBySubject,
    getRankedSubjects,
    filterTopics,
    refreshChildData,
    markSubjectAccess,
    completeTopic,
  };
}
