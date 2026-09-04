import { render } from '@testing-library/react-native';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders status as text and exposes it to accessibility', async () => {
    const { getByText, getByLabelText } = await render(<StatusBadge status="partial" ratio={0.7} />);
    expect(getByText('Partial coverage')).toBeTruthy();
    expect(getByLabelText('Partial coverage')).toBeTruthy();
  });

  it('compact mode keeps the accessibility label without visible text', async () => {
    const { queryByText, getByLabelText } = await render(<StatusBadge status="untrained" ratio={0} compact />);
    expect(queryByText('Not trained this week')).toBeNull();
    expect(getByLabelText('Not trained this week')).toBeTruthy();
  });
});
