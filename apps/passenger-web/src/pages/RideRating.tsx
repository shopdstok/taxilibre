import React, { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RatingStars } from '../components/Rating/RatingStars';
import { TipSelection } from '../components/Rating/TipSelection';
import { CommentInput } from '../components/Rating/CommentInput';
import { IssueSelection } from '../components/Rating/IssueSelection';
import { Button } from '../components/UI/Button';

const RideRating: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const route = useRoute();

  const { rideId } = route.params as { rideId: string };
  const { rating: currentRating, comment: currentComment, tip: currentTip, issues: currentIssues } = useAppSelector(
    (state: any) => state.ratingData || {}
  );

  const [rating, setRating] = useState(currentRating || 0);
  const [comment, setComment] = useState(currentComment || '');
  const [tip, setTip] = useState(currentTip || 0);
  const [issues, setIssues] = useState(currentIssues || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Dispatch individual actions to update rating data
      dispatch.setRating(rating);
      dispatch.setComment(comment);
      dispatch.setTip(tip);
      dispatch.setIssues(issues);
      
      // In a real app, we would also send this to the server via an API call
      // For now, we'll just update the local state and show success
      
      setSuccess(true);
      // Navigate back after delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center w-20 h-20 bg-green-100 rounded-full">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Merci pour votre avis !</h2>
          <p className="text-gray-600">
            Votre évaluation aidera à améliorer notre service pour tous les utilisateurs.
          </p>
          <Button onClick={() => navigation.goBack()}>Retour à l'accueil</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Évaluez votre course</h1>
          <p className="text-gray-600">
            Votre avis est précieux pour nous aider à améliorer notre service.
          </p>
        </div>

        <form onClick={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center">
              <span className="mr-3 text-gray-600">Note : </span>
              <RatingStars
                rating={rating}
                onRatingSelect={setRating}
                readOnly={false}
              />
            </div>
          </div>

          <IssueSelection
            selectedIssues={issues}
            onIssuesChange={setIssues}
          />

          <TipSelection
            selectedTip={tip}
            onTipChange={setTip}
          />

          <CommentInput
            value={comment}
            onValueChange={setComment}
          />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => navigation.goBack()}
              className="flex-1 mr-3"
            >
              Ignorer
            </Button>
            <Button
              isLoading={submitting}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Envoi...' : 'Soumettre l\'avis'}
            </Button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}
      </div>
    );
  );
};

export default RideRating;
