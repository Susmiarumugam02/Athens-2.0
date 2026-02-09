import React, { useState, useCallback } from 'react';
import { Select, Spin } from 'antd';
import { debounce } from 'lodash';
import { searchUsers } from '../api';
import useAuthStore from '../../../common/store/authStore';

interface PersonnelOption {
  id: number;
  username: string;
  full_name: string;
  email: string;
  admin_type: string;
  grade: string;
  department: string;
  designation: string;
}

interface PersonnelSelectProps {
  value?: number;
  onChange?: (value: number) => void;
  placeholder?: string;
  userType?: string;
  grade?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

const PersonnelSelect: React.FC<PersonnelSelectProps> = ({
  value,
  onChange,
  placeholder = "Search and select personnel",
  userType,
  grade,
  style,
  disabled = false
}) => {
  const [options, setOptions] = useState<PersonnelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const { projectId, project } = useAuthStore();
  const actualProjectId = projectId || project?.id;

  const debouncedSearch = useCallback(
    debounce(async (searchValue: string) => {
      if (!searchValue.trim()) {
        setOptions([]);
        return;
      }

      setLoading(true);
      try {
        console.log('PersonnelSelect: Searching for:', searchValue, { userType, grade, projectId: actualProjectId });
        const response = await searchUsers({
          q: searchValue,
          user_type: userType,
          grade: grade,
          project: actualProjectId
        });
        console.log('PersonnelSelect: Search response:', response.data?.length, 'users found');
        setOptions(response.data || []);
      } catch (error) {
        console.error('Personnel search failed:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300),
    [userType, grade, actualProjectId]
  );

  const handleSearch = (value: string) => {
    debouncedSearch(value);
  };

  const handleChange = (selectedValue: number) => {
    onChange?.(selectedValue);
  };

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      style={style}
      disabled={disabled}
      filterOption={false}
      onSearch={handleSearch}
      onChange={handleChange}
      notFoundContent={loading ? <Spin size="small" /> : 'No personnel found'}
      optionLabelProp="label"
    >
      {options.map(option => (
        <Select.Option 
          key={option.id} 
          value={option.id}
          label={option.full_name}
        >
          <div>
            <div style={{ fontWeight: 500 }}>{option.full_name}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {option.designation && `${option.designation}`}
              {option.department && ` • ${option.department}`}
              {option.admin_type && ` • ${option.admin_type?.toUpperCase()}`}
              {option.grade && ` Grade ${option.grade}`}
            </div>
          </div>
        </Select.Option>
      ))}
    </Select>
  );
};

export default PersonnelSelect;