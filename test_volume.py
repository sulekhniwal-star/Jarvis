import unittest
from skills.pc_control import set_volume, get_volume

class TestVolumeControl(unittest.TestCase):
    def test_set_volume(self):
        """Test setting the volume."""
        # Save the original volume
        original_volume = get_volume()
        self.assertNotEqual(original_volume, -1, "Failed to get original volume")

        # Set the volume to a specific level
        test_volume = 50
        response = set_volume(test_volume)
        self.assertEqual(response, f"Volume set to {test_volume}%")

        # Check if the volume was set correctly
        current_volume = get_volume()
        self.assertEqual(current_volume, test_volume)

        # Restore the original volume
        response = set_volume(original_volume)
        self.assertEqual(response, f"Volume set to {original_volume}%")

if __name__ == '__main__':
    unittest.main()
