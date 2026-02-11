import { useFirestoreCollection } from './useFirestore';
import { useAuth } from '../../contexts/AuthContext';
import { initialJobState } from '../../constants';

/**
 * Hook for managing jobs
 */
export function useJobs() {
  const { userId } = useAuth();
  const { data, loading, error, add, update, remove } = useFirestoreCollection(userId, 'jobs');

  const addJob = async (jobData) => {
    return await add({
      ...initialJobState,
      ...jobData,
      status: jobData.status || 'Scheduled',
    });
  };

  const updateJob = async (jobId, updates) => {
    return await update(jobId, updates);
  };

  const deleteJob = async (jobId) => {
    return await remove(jobId);
  };

  const getJobById = (jobId) => {
    return data.find(job => job.id === jobId);
  };

  const getJobsByClient = (clientId) => {
    return data.filter(job => job.clientId === clientId);
  };

  const getJobsByStatus = (status) => {
    return data.filter(job => job.status === status);
  };

  const getJobsByDateRange = (startDate, endDate) => {
    return data.filter(job => {
      const jobStart = new Date(job.start);
      return jobStart >= new Date(startDate) && jobStart <= new Date(endDate);
    });
  };

  const updateJobStatus = async (jobId, status) => {
    return await updateJob(jobId, { status });
  };

  return {
    jobs: data,
    loading,
    error,
    addJob,
    updateJob,
    deleteJob,
    getJobById,
    getJobsByClient,
    getJobsByStatus,
    getJobsByDateRange,
    updateJobStatus,
  };
}
